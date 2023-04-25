import type { NextPage } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Image src="/temple-title.png" alt="App Title" width={600} height={200} />
        <Image src="/portal.png" alt="Temple Rune" width={400} height={400} />
        <br />
        <Link href="/vestibule"><Image alt="Enter Button" src="/enter-button.png" width={200} height={100} /></Link>
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
