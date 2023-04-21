import type { NextPage } from 'next'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Vestry: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h2>The Vestry</h2>
        <p>Welcome, Director.</p>  
        <br />
        <Link href="/sanctuary">Teleport to Sanctuary</Link>
        <Link href="/vestibule">Teleport to Vestibule</Link>
        <Link href="/">Teleport to the Portal</Link>
      </main>
    </div>
  )
}

export default Vestry