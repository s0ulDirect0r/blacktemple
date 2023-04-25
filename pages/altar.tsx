import type { NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

import freedomBanner from '../public/freedom-banner.png'
import returnButton from '../public/return-button.png'

const Altar: NextPage = () => {
  return (
    <div className={`${styles.container} ${styles.altar}`}>
      <main className={styles.main}>
        <Image alt="Altar Name" src={freedomBanner} className={styles.freedomBanner} />
        {/* Embed a Youtube Link Here */}
        <iframe width="560" height="315" src="https://www.youtube.com/embed/iuIg7RQAEUM" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
        <br />
        <Link href="/sanctuary"><Image alt="Return Button" src={returnButton} /></Link>
      </main>
    </div>

  )
}

export default Altar
