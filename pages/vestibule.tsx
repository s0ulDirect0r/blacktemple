import type { NextPage } from 'next'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Vestibule: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h2>The Vestibule</h2>
        <p>Welcome to the Black Temple. This is a place of worship. This is a place to connect with the Divine within the Wilds of the Internet.</p>
        <p>This is the Vestibule. A place to gather yourself. Get centered. Put yourself in a place to commune with the temple.</p>
        <p>Take a deep breath. Relax. Turn on some chill music. You&apos;re ok.</p>
        <p>Please enjoy your time at the Temple.</p>

        <br />
        <Link href="/sanctuary">Enter The Sanctuary</Link>
        <br />
        <Link href="/">Return to the Portal</Link>
      </main>
    </div>
  )
}

export default Vestibule