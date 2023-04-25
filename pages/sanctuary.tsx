import type { NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css' 

const Sanctuary: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Image src="/sanctuary-title.png" alt="Sanctuary Title" width={500} height={150} />
        <div className={styles.vestibule}>
            <Link href="/altar">Enter The Altar of FREEDOM</Link>
            {/* <h4>Altar of the HOME</h4>
            <iframe width="560" height="315" src="https://www.youtube.com/embed/qnJKFwXKtQc" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe> */}
        </div>

        <br />
        <Link href="/vestibule"><Image src="/vestibule-button.png" alt="Vestibule Button" width={100} height={50} /></Link>
      </main>
    </div>
  )
}

export default Sanctuary