// The public face of the project: what Wall is, how it works, and how to build one.
// The owner, once signed in, is sent straight on to the app.
import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import Logo from "@/components/Logo";
import Hero from "@/components/landing/Hero";
import Reveal from "@/components/landing/Reveal";
import CornerDemo from "@/components/landing/CornerDemo";
import OwnerRedirect from "@/components/landing/OwnerRedirect";
import { SITE } from "@/lib/config";

function Node({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <div className="node">
      <span className="node-icon"><Icon name={icon} size={20} /></span>
      <b>{title}</b>
      <p>{children}</p>
    </div>
  );
}

function Wire({ label }: { label: string }) {
  return <div className="wire"><span>{label}</span><Icon name="chevron" size={16} weight={2.4} /></div>;
}

export default function Home() {
  return (
    <main className="landing">
      <OwnerRedirect />
      <nav className="l-nav glass">
        <Link href="/?about" className="brand"><Logo size={30} /><span>Wall</span></Link>
        <span className="grow" />
        <a className="l-link" href={SITE.repo} target="_blank" rel="noreferrer" aria-label="Wall on GitHub"><Icon name="github" size={20} /></a>
        <Link className="capsule small" href="/edit">Sign In</Link>
      </nav>

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Open source · Next.js, Supabase, Swift, Claude</p>
          <h1>A whiteboard that <em>writes itself.</em></h1>
          <p className="lede">
            Wall turns the whiteboard beside my desk and a budget projector into a live dashboard. My calendar, my reminders
            and my deadlines, lit onto the board and changed from my phone or with one sentence to Siri.
          </p>
          <div className="cta">
            <a className="capsule primary" href={SITE.repo} target="_blank" rel="noreferrer"><Icon name="github" size={18} />Star on GitHub</a>
            <a className="capsule" href="#how">How it works</a>
          </div>
        </div>
        <Hero />
      </header>

      <section className="band split" id="say">
        <Reveal className="head">
          <p className="eyebrow">Say it</p>
          <h2>One sentence is enough.</h2>
          <p>Type it, dictate it, or say it to Siri from across the room. Claude reads the sentence next to the board and the calendar, and answers with structured changes. Never free text, so nothing unexpected reaches the wall.</p>
        </Reveal>
        <Reveal className="pipeline">
          <div className="pipe-card said"><span className="tag">You</span><p>Hey Siri, Wall. Cassini hackathon on the 27th.</p></div>
          <Icon name="down" size={22} />
          <div className="pipe-card code"><span className="tag">Claude, forced tool call</span>
            <pre>{`{ "op": "addItem", "list": "Hackathons",\n  "text": "Cassini", "due": "2026-11-27" }`}</pre>
          </div>
          <Icon name="down" size={22} />
          <div className="pipe-card wallrow"><span className="tag">On the wall, about a second later</span>
            <div className="row"><span className="bullet" />Cassini<span className="chip soon">in 3d</span></div>
          </div>
        </Reveal>
      </section>

      <section className="band" id="how">
        <Reveal className="head">
          <p className="eyebrow">How it works</p>
          <h2>Five small parts, one row of data.</h2>
          <p>The whole board is a single JSON row. Every change is an operation applied on the server, and Supabase Realtime pushes the new row to the wall.</p>
        </Reveal>
        <Reveal className="diagram">
          <div className="col">
            <Node icon="list" title="iPhone">The editor as a home screen app, plus a Siri shortcut named Wall.</Node>
            <Node icon="calendar" title="Mac">Wall Agent, a small Swift app, reads Apple Calendar and Reminders through EventKit.</Node>
          </div>
          <div className="wires"><Wire label="changes" /><Wire label="snapshot" /></div>
          <div className="col">
            <Node icon="sparkle" title="Vercel and Claude">Next.js routes check who is calling, ask Claude for operations and apply them atomically.</Node>
            <Node icon="lock" title="Supabase">Postgres with row level security. One account can read, and no browser can write.</Node>
          </div>
          <div className="wires"><Wire label="realtime" /></div>
          <div className="col">
            <Node icon="wall" title="The wall">A fixed 720 by 1280 canvas in a browser window, sent to the projector over HDMI and warped to fit the board.</Node>
          </div>
        </Reveal>
      </section>

      <section className="band" id="details">
        <Reveal className="head">
          <p className="eyebrow">Details</p>
          <h2>Made for a room you live in.</h2>
        </Reveal>
        <div className="bento">
          <Reveal className="tile wide">
            <div>
              <h3>Square on any wall</h3>
              <p>The projector sits off to one side, so the picture lands crooked. Drag the four corners on your phone and a single CSS matrix straightens it. Try it here.</p>
            </div>
            <CornerDemo />
          </Reveal>
          <Reveal className="tile" delay={80}>
            <h3>Deadlines change colour</h3>
            <p>Countdowns stay calm until they should not.</p>
            <div className="chips-demo"><span className="chip">in 9d</span><span className="chip soon">in 3d</span><span className="chip hot">tomorrow</span></div>
          </Reveal>
          <Reveal className="tile">
            <span className="tile-icon"><Icon name="moon" size={22} /></span>
            <h3>Dark when you sleep</h3>
            <p>Quiet hours switch the wall off at night. On a projector black is simply no light, so the room goes dark.</p>
          </Reveal>
          <Reveal className="tile" delay={80}>
            <span className="tile-icon"><Icon name="shield" size={22} /></span>
            <h3>The projector stays offline</h3>
            <p>The HY300 ships with malware in its stock Android. It never joins a network here. It is only an HDMI screen.</p>
          </Reveal>
          <Reveal className="tile" delay={160}>
            <span className="tile-icon"><Icon name="lock" size={22} /></span>
            <h3>Private by default</h3>
            <p>Sign ups are closed, reads are limited to one account, and every write goes through a server that checks who is asking.</p>
          </Reveal>
        </div>
      </section>

      <section className="band" id="build">
        <Reveal className="head">
          <p className="eyebrow">Build your own</p>
          <h2>A free evening and a spare wall.</h2>
          <p>Everything runs on free tiers. Each spoken command costs well under a cent.</p>
        </Reveal>
        <Reveal className="build">
          <ol>
            <li><b>Point a projector at a board.</b><span>Any projector with HDMI works. Turn it on its side for a portrait image.</span></li>
            <li><b>Create a Supabase project.</b><span>Run one SQL file. It makes two tables and locks them to your account.</span></li>
            <li><b>Deploy to Vercel.</b><span>Fork the repository, add seven environment variables, push.</span></li>
            <li><b>Install the Mac agent.</b><span>One script builds it and starts it at login. Skip it if you do not use Apple Calendar.</span></li>
          </ol>
          <div className="cta">
            <a className="capsule primary" href={SITE.repo} target="_blank" rel="noreferrer"><Icon name="github" size={18} />Get the code</a>
            <a className="capsule" href={`${SITE.repo}/blob/main/SETUP.md`} target="_blank" rel="noreferrer">Read the setup guide</a>
          </div>
        </Reveal>
      </section>

      <footer className="l-foot">
        <Logo size={26} />
        <p>Built by <a href={SITE.authorUrl} target="_blank" rel="noreferrer">{SITE.author}</a> in Dublin. MIT licensed.</p>
        <p><a href={SITE.repo} target="_blank" rel="noreferrer">GitHub</a><Link href="/edit">Sign In</Link></p>
      </footer>
    </main>
  );
}
