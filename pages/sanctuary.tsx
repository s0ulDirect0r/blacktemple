import type { NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

import sanctuaryTitle from '../public/sanctuary-title.png'
import freedomButton from '../public/freedom-button.png'
import vestibuleButton from '../public/vestibule-button.png'

const Sanctuary: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Image src={sanctuaryTitle} alt="Sanctuary Title" className={styles.sanctuaryTitle} />
        <div className={styles.vestibule}>
            <Link href="/altar"><Image src={freedomButton} alt="Freedom Button" className={styles.freedomButton} /></Link>
            {/* <h4>Altar of the HOME</h4>
            <iframe width="560" height="315" src="https://www.youtube.com/embed/qnJKFwXKtQc" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe> */}
        </div>

        <br />
        <Link href="/vestibule"><Image src={vestibuleButton} alt="Vestibule Button" className={styles.vestibuleButton} /></Link>
      </main>
    </div>
  )
}

export default Sanctuary