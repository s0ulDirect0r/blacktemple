import type { NextPage } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

const Vestibule: NextPage = () => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <Image src="/vestibule-title.png" alt="Vestibule Title" width={500} height={150} />
        <div className={styles.vestibule}>
          <p>Welcome to the Black Temple. This is a place of worship. This is a place to connect with the Divine within the Wilds of the Internet.</p>
          <p>This is the Vestibule. A place to gather yourself. Get centered. Put yourself in a place to commune with the temple.</p>
          <p>Take a deep breath. Relax. Turn on some chill music. You&apos;re ok.</p>
          <p>Here's a favorite of the Director's if you'd like a suggestion :)</p>
          <iframe width="560" height="315" src="https://www.youtube.com/embed/72nCMmgIVT4" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
          <p>Please enjoy your time at the Temple.</p>
        </div>
        <br />
        <Link href="/sanctuary"><Image alt="Sanctuary Button" src="/sanctuary-button.png" width={300} height={150} /></Link>
        <br />
        <Link href="/"><Image alt="Return Button" src="/return-button.png" width={100} height={50} /></Link>
      </main>
    </div>
  )
}

export default Vestibule