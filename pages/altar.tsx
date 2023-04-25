import type { NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import ReactPlayer from 'react-player/youtube'
import styles from '../styles/Home.module.css'

import freedomBanner from '../public/freedom-banner.png'
import returnButton from '../public/return-button.png'

const Altar: NextPage = () => {
  return (
    <div className={`${styles.container} ${styles.altar}`}>
      <main className={styles.main}>
        <Image alt="Altar Name" src={freedomBanner} className={styles.freedomBanner} />
        {/* Embed a Youtube Link Here */}
        <ReactPlayer
          url="https://www.youtube.com/watch?v=iuIg7RQAEUM" className={styles.reactPlayer} />
        <br />
        <Link href="/sanctuary"><Image alt="Return Button" src={returnButton} /></Link>
      </main>
    </div>

  )
}

export default Altar
