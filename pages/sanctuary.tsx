import type { NextPage } from 'next'
import Link from 'next/link'
import styles from '../styles/Home.module.css' 

const Sanctuary: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h2>The Sanctuary</h2>
        <Link href="/altar">Enter The Altar of FREEDOM</Link>
        {/* <h4>Altar of the HOME</h4>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/qnJKFwXKtQc" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe> */}
        <br />
        <Link href="/vestibule">Return to the Vestibule</Link>
        <Link href="/vestry">Enter the Vestry</Link>
      </main>
    </div>
  )
}

export default Sanctuary