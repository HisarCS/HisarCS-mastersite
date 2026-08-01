import { SiteHeader } from './SiteHeader';
import styles from './AboutPage.module.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const SUMMITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** About Us — the HisarCS story, ported from the original hisarcs.github.io/about.html. */
export function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.eyebrow}>Hisar High School · Istanbul</div>
        <h1 className={styles.title}>About HisarCS</h1>

        <figure className={styles.figure}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/about/main.jpg`} alt="The HisarCS team" className={styles.img} />
        </figure>

        <p className={styles.p}>
          We are HisarCS, a computer science team from Hisar High School in Istanbul, Turkey. What
          started in 2012 as a couple of students developing projects around a small table grew
          throughout the years, and now has over 30 students actively developing CS &amp; robotics
          projects and attending competitions &amp; conferences all around the world. Our team
          members are between the ages of 13-18.
        </p>

        <figure className={styles.figure}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/about/stat.jpg`} alt="HisarCS in numbers" className={styles.img} />
        </figure>

        <h2 className={styles.heading}>Peer Learning</h2>
        <p className={styles.p}>
          As HisarCS, we are learning everyday from each other. We know that we are having some
          troubles with our projects, we can ask our friends and learn together. We are aware that
          making mistakes is a big part of the learning process. And that is where our motto came
          from.
        </p>

        <figure className={`${styles.figure} ${styles.inset}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${BASE}/about/motto.png`}
            alt="Make, fail, learn, repeat"
            className={styles.img}
          />
        </figure>

        <p className={styles.p}>
          If you spend a day with us, we guarantee that you will hear these four words more than 15
          times. When starting a project, we are aware that it is not going to be perfect, and that
          is what we enjoy, failing. It may sound weird, to love to fail. But failing is what takes
          us a step forward. It makes us rethink, reconsider what we did, and it helps to find new
          strategies to get closer to our goal. And that is when the learn step starts. We learn
          from our mistakes, and then repeat all the process again, although it means that we will
          fail again. This motto helps us encourages creativity and nurtures persistence because you
          know that there is a solution to your problem - and you debug and debug until you reach
          your destination - always
        </p>
        <p className={`${styles.p} ${styles.ps}`}>
          PS: sometimes we come to a state where we delete the learn part and turn our motto to make
          fail repeat, since we do the same mistake over and over again :0
        </p>

        <div className={styles.photoGrid}>
          {SUMMITS.map((n) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={n}
              src={`${BASE}/about/summit${n}.jpg`}
              alt={`Coding summit photo ${n}`}
              loading="lazy"
              decoding="async"
              className={styles.photo}
            />
          ))}
        </div>
      </main>
      <footer className={styles.footer}>Hisar School · ideaLab</footer>
    </>
  );
}
