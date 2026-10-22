import Link from 'next/link';
import { pageMetadata } from '@/lib/site';
import { memberSession } from '@/lib/membership/auth';
import { TIERS, money, paidMembershipVisible } from '@/lib/membership/config';
import FreeMembership from '@/components/membership/FreeMembership';
import styles from '@/components/membership/membership.module.css';
import Testimonials from '@/components/temple/Testimonials';
import ui from '@/components/temple/temple.module.css';
import { localTemplePreview } from '@/lib/temple/preview';

export const metadata = pageMetadata({ title: 'Membership', description: 'Join Black Temple: one free account for ESCALATION and the games, art and writing taking shape here.', path: '/membership' });
export const dynamic = 'force-dynamic';
export default async function MembershipPage() {
  const session = await memberSession();
  if (!paidMembershipVisible()) return <FreeMembership signedIn={Boolean(session)} />;
  return <div className={styles.world}><main className={styles.shell}>
    {localTemplePreview()&&<p className={styles.badge}>Local synthetic preview · test accounts and contributions</p>}
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Black Temple · Membership</p>
      <h1 className={styles.title}>A temple of<br />creative experimentation.</h1>
      <p className={styles.lead}>Come closer to what I&apos;m making. Make room for what&apos;s alive in you.</p>
      <div className={styles.prose} style={{ marginTop: 22 }}><p>Black Temple began as an imaginal Temple in 2022, with the Unknown Machine as a portal. It is where I make games, art, and stories—and a place for other people to give their own worlds expression.</p><p>Bring a poem, a sketch, a strange idea, or something still becoming. Follow the work quietly, or enter the conversation. <strong>Your curiosity has a place here.</strong> Paying members have no activity requirement.</p></div>
      {process.env.MEMBERSHIP_BILLING_MODE !== 'live' && <p className={styles.badge}>Local offering draft · sandbox payments</p>}
    </header>
    <p className={styles.prose}>Choose a three-month term. Three monthly payments, then it ends. <strong>No automatic renewal or fourth charge.</strong></p>
    <div className={styles.cards}>{TIERS.map(tier => <article className={styles.card} key={tier.id}>
      <h2>{tier.name}</h2><p className={styles.price}>{money(tier.monthlyCents)}<small> / month</small></p>
      <p className={styles.note}>3 payments · {money(tier.monthlyCents * 3)} USD total</p>
      <p className={styles.invitation}>{tier.invitation}</p><p className={styles.description}>{tier.description}</p>
      <ul className={styles.benefits}>{tier.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
      <Link className={styles.button} href={'/membership/checkout?tier=' + tier.id}>Choose {tier.name} <span aria-hidden="true">↗</span></Link>
    </article>)}</div>
    <section className={ui.invitation}><p className={styles.eyebrow}>The shared Temple</p><h2>A room for what you&apos;re making.</h2><div className={styles.prose} style={{marginTop:18}}><p>One members-only feed for poems, images, links, works in progress and fragments. Choose your Temple name, alias, avatar and creative persona. Respond with a reply, a spark, resonance or wonder.</p><p><strong>Feed the Unknown Machine.</strong> “What did you create today?” is an optional invitation. Each visible offering adds one light to the day&apos;s collective signal. Quiet days are welcome. There are no streaks, quotas or promised rewards.</p><p>Your own posts, replies and original images can leave with you in a readable, reusable export—even after paid membership ends. Other members&apos; private contributions stay private. Public sharing would require the author&apos;s explicit consent.</p></div><div className={styles.actions}><Link className={styles.secondary} href={session?'/members/feed':'/login'}>{session?'Enter the shared room ↗':'Choose your place in the Temple ↗'}</Link></div></section>
    <section className={styles.prose} style={{margin:'48px 0'}}><p className={styles.eyebrow}>Anansi · The Soul Director</p><h2 className={styles.sectionTitle} style={{color:'#f4f4f5',margin:'14px 0 22px'}}>Why I’m building this</h2>
      <p>There is an imaginal place inside me that wants expression and life. Black Temple gives that place a form; a community of people creating here can give it more life.</p>
      <p>I also need money, patronage and support to continue my creative journey. My resources are constrained. Membership helps sustain the games, art and writing I make, and the time I want to give to other people&apos;s creativity and desires.</p>
      <p>I believe creativity will become especially important as AI advances and we approach what people call the singularity. That is my outlook, rather than a guaranteed prediction. Years of confronting my own creativity, and experience supporting others&apos; desires and creative work, inform my felt calling to help.</p>
      <p>That experience includes Quest guide work with the Empowerment Department of The Service Guild. You can explore <a className={styles.textLink} href="https://serviceguild.fun/give-your-gift/" target="_blank" rel="noopener noreferrer">the department&apos;s creative service work</a>, <a className={styles.textLink} href="https://www.patreon.com/posts/january-2024-97116761" target="_blank" rel="noopener noreferrer">the introduction of Anansi as a Quest guide</a>, and <Link className={styles.textLink} href="/portfolio">the work already taking shape in my portfolio</Link>.</p>
    </section>
    <Testimonials />
    <section className={styles.panel} style={{marginBottom:40}} aria-labelledby="patronage-plan"><p className={styles.eyebrow}>First experiment · Draft for review</p><h2 id="patronage-plan" className={styles.sectionTitle}>How patronage will be used</h2><p className={styles.prose} style={{marginTop:18}}>I want to be transparent about exactly how patronage money will be used in this first experiment. I haven&apos;t decided the allocations yet. This space is reserved for that plan once I&apos;ve worked it out and reviewed it.</p><p className={styles.note}>A finalized budget or allocation plan is not available yet.</p></section>
    <section className={styles.prose}><h2 className={styles.sectionTitle} style={{ color: '#f4f4f5', marginBottom: 20 }}>What you&apos;re entering</h2>
      <p>The archive and studio dispatches are for members. Gatherings are a space to bring a work in progress, share what you&apos;re exploring, or simply be in the room. Private conversations can follow your desires or the creative thing you want to give more life to.</p>
      <p>You don&apos;t need a polished project or a clear answer. Bring presence, curiosity, compassion, and wonder.</p>
      <p>The wider vision includes weekly process streams, monthly check-ins, seasonal creative experiments, shared world-building, and eventually creative powers for members and their agents. These are directions for the Temple, not features or rewards available in this first shared room.</p>
      <p className={styles.note}>This first invitation is still being shaped. Tier benefits shown above are the existing commercial draft; the final allocation, cancellation and refund terms, and arrangements for missed sessions need review before a live opening. This implementation opens the shared room to active members across the current tiers. No new schedule, consultation limit or reward is promised here.</p>
      <div className={styles.actions}><Link className={styles.secondary} href={session ? '/members' : '/login'}>{session ? 'Enter your members area ↗' : 'Already have an account? Sign in ↗'}</Link></div>
    </section>
    <footer className={styles.footer}><span className="font-pixel" style={{ fontSize: 9 }}>Black Temple</span><Link className={styles.textLink} href="/privacy">Privacy</Link></footer>
  </main></div>;
}
