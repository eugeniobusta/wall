// Wall Agent: a menu-bar-less background app that reads Apple Calendar + Reminders and uploads
// a snapshot to Supabase every 5 minutes, and within seconds of any calendar change.
// Config: ~/Library/Application Support/WallAgent/config.json  {"supabaseUrl": "...", "serviceRoleKey": "..."}
// Log:    ~/Library/Logs/WallAgent.log
import AppKit
import EventKit
import Foundation

let home = FileManager.default.homeDirectoryForCurrentUser
let configURL = home.appendingPathComponent("Library/Application Support/WallAgent/config.json")
let logURL = home.appendingPathComponent("Library/Logs/WallAgent.log")
let daysAhead = 15

func log(_ msg: String) {
    let line = "\(ISO8601DateFormatter().string(from: Date())) \(msg)\n"
    if let h = try? FileHandle(forWritingTo: logURL) { h.seekToEndOfFile(); h.write(line.data(using: .utf8)!); try? h.close() }
    else { try? line.write(to: logURL, atomically: true, encoding: .utf8) }
}

struct Config: Decodable { let supabaseUrl: String; let serviceRoleKey: String }

final class Agent {
    let store = EKEventStore()
    let iso = ISO8601DateFormatter()
    let config: Config
    var calOK = false, remOK = false
    var pending: DispatchWorkItem?

    init(config: Config) { self.config = config }

    func start() {
        let group = DispatchGroup()
        group.enter(); group.enter()
        let done: (Bool, Error?, Bool) -> Void = { granted, err, isCal in
            if isCal { self.calOK = granted } else { self.remOK = granted }
            if let err { log("permission error: \(err.localizedDescription)") }
            group.leave()
        }
        if #available(macOS 14.0, *) {
            store.requestFullAccessToEvents { g, e in done(g, e, true) }
            store.requestFullAccessToReminders { g, e in done(g, e, false) }
        } else {
            store.requestAccess(to: .event) { g, e in done(g, e, true) }
            store.requestAccess(to: .reminder) { g, e in done(g, e, false) }
        }
        group.notify(queue: .main) {
            log("access: calendar=\(self.calOK) reminders=\(self.remOK)")
            self.sync()
            Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { _ in self.sync() }
            NotificationCenter.default.addObserver(forName: .EKEventStoreChanged, object: self.store, queue: .main) { _ in self.syncSoon() }
            NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { _ in self.syncSoon() }
        }
    }

    /// Calendar edits arrive in bursts; wait a few seconds and upload once.
    func syncSoon() {
        pending?.cancel()
        let work = DispatchWorkItem { self.sync() }
        pending = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 3, execute: work)
    }

    func hex(_ c: CGColor?) -> String {
        guard let c, let s = CGColorSpace(name: CGColorSpace.sRGB),
              let comps = c.converted(to: s, intent: .defaultIntent, options: nil)?.components, comps.count >= 3 else { return "" }
        return String(format: "#%02X%02X%02X", Int(comps[0] * 255), Int(comps[1] * 255), Int(comps[2] * 255))
    }

    func sync() {
        var events: [[String: Any]] = []
        if calOK {
            let start = Calendar.current.startOfDay(for: Date())
            let end = Calendar.current.date(byAdding: .day, value: daysAhead, to: start)!
            let pred = store.predicateForEvents(withStart: start, end: end, calendars: nil)
            for e in store.events(matching: pred).sorted(by: { $0.startDate < $1.startDate }) {
                events.append([
                    "title": e.title ?? "", "start": iso.string(from: e.startDate), "end": iso.string(from: e.endDate),
                    "allDay": e.isAllDay, "location": e.location ?? "", "calendar": e.calendar.title, "color": hex(e.calendar.cgColor),
                ])
            }
        }
        guard remOK else { upload(events: events, reminders: []); return }
        let pred = store.predicateForIncompleteReminders(withDueDateStarting: nil, ending: nil, calendars: nil)
        store.fetchReminders(matching: pred) { found in
            var reminders: [[String: Any]] = []
            for r in found ?? [] {
                var item: [String: Any] = ["title": r.title ?? "", "list": r.calendar.title]
                if let comps = r.dueDateComponents, let d = Calendar.current.date(from: comps) {
                    item["due"] = self.iso.string(from: d)
                    item["dueHasTime"] = comps.hour != nil
                }
                reminders.append(item)
            }
            DispatchQueue.main.async { self.upload(events: events, reminders: reminders) }
        }
    }

    func upload(events: [[String: Any]], reminders: [[String: Any]]) {
        let now = iso.string(from: Date())
        let data: [String: Any] = ["events": events, "reminders": reminders, "calendarAccess": calOK, "remindersAccess": remOK, "syncedAt": now]
        let row: [String: Any] = ["id": 1, "data": data, "updated_at": now]
        guard let url = URL(string: config.supabaseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/rest/v1/calendar_snapshot"),
              let body = try? JSONSerialization.data(withJSONObject: row) else { log("bad config URL"); return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.httpBody = body
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(config.serviceRoleKey, forHTTPHeaderField: "apikey")
        // Legacy service_role keys are JWTs and go in Authorization too; new sb_secret_ keys only in apikey.
        if config.serviceRoleKey.hasPrefix("eyJ") { req.setValue("Bearer \(config.serviceRoleKey)", forHTTPHeaderField: "Authorization") }
        req.setValue("resolution=merge-duplicates,return=minimal", forHTTPHeaderField: "Prefer")
        URLSession.shared.dataTask(with: req) { respData, resp, err in
            if let err { log("upload failed: \(err.localizedDescription)"); return }
            let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
            if (200..<300).contains(code) { log("synced \(events.count) events, \(reminders.count) reminders") }
            else { log("upload HTTP \(code): \(String(data: respData ?? Data(), encoding: .utf8) ?? "")") }
        }.resume()
    }
}

try? FileManager.default.createDirectory(at: logURL.deletingLastPathComponent(), withIntermediateDirectories: true)
guard let raw = try? Data(contentsOf: configURL), let config = try? JSONDecoder().decode(Config.self, from: raw) else {
    log("missing or invalid \(configURL.path); run agent/install.sh again")
    exit(1)
}

let app = NSApplication.shared
// A windowless app is a prime App Nap candidate; this keeps the 5-minute timer on schedule.
let activity = ProcessInfo.processInfo.beginActivity(options: [.userInitiatedAllowingIdleSystemSleep], reason: "Syncing calendar to the wall")
app.setActivationPolicy(.accessory) // no Dock icon, no menu bar
let agent = Agent(config: config)
agent.start()
app.run()
