import type { NextPage } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Altar: NextPage = () => {
  return (
    <div className={`${styles.container} ${styles.altar}`}>
      <main className={styles.main}>
        <Image alt="Altar Name" src="/freedom-banner.png" width={1500} height={500} />
        {/* Embed a Youtube Link Here */}
        <iframe width="560" height="315" src="https://www.youtube.com/embed/iuIg7RQAEUM" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
        <br />
        <Link href="/sanctuary"><Image alt="Return Button" src="/return-button.png" width={100} height={50} /></Link>
      </main>
    </div>

  )
}

export default Altar
