import type { NextPage } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import portalRune from '../public/portal.png'
import enterButton from '../public/enter-button.png'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Image src={portalRune} className={styles.portalRune} alt="Temple Rune" />
        <br />
        <Link href="/vestibule"><Image className={styles.enterButton} alt="Enter Button" src={enterButton} /></Link>
      </main>

      <footer className={styles.footer}>
        <a
          href="/__repl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Built on
          <span className={styles.logo}>
            <Image src="/replit.svg" alt="Replit Logo" width={20} height={18} />
          </span>
          Replit
        </a>
      </footer>
    </div>
  )
}

export default Home
