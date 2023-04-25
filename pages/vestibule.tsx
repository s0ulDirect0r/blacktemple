import type { NextPage } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import vestibuleTitle from '../public/vestibule-title.png'
import sanctuaryButton from '../public/sanctuary-button.png'
import returnButton from '../public/return-button.png'

const Vestibule: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Image src={vestibuleTitle} alt="Vestibule Title" className={styles.vestibuleTitle} />
        <div className={styles.vestibule}>
          <p>Welcome to the Black Temple. This is a place of worship. This is a place to connect with the Divine within the Wilds of the Internet.</p>
          <p>This is the Vestibule. A place to gather yourself. Get centered. Put yourself in a place to commune with the temple.</p>
          <p>Take a deep breath. Relax. Turn on some chill music. You&apos;re ok.</p>
          <p>Here&apos;s a favorite of the Director&apos;s if you&apos;d like a suggestion :)</p>
          <iframe width="560" height="315" src="https://www.youtube.com/embed/72nCMmgIVT4" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
          <p>Please enjoy your time at the Temple.</p>
        </div>
        <br />
        <Link href="/sanctuary"><Image alt="Sanctuary Button" src={sanctuaryButton} className={styles.sanctuaryButton} /></Link>
        <Link href="/"><Image alt="Return Button" src={returnButton} /></Link>
      </main>
    </div>
  )
}

export default Vestibule