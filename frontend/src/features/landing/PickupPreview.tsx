import s from './PickupPreview.module.css';

// A static phone-sized rendition of the volunteer task card
export function PickupPreview() {
  return (
    <figure className={s.device} aria-label="Preview of the volunteer pickup card">
      <div className={s.screen}>
        <div className={s.map} aria-hidden>
          <span className={s.roadA} />
          <span className={s.roadB} />
          <span className={s.roadC} />
          <svg className={s.path} viewBox="0 0 340 300" preserveAspectRatio="none">
            <path d="M90 230 C 130 150, 200 190, 250 90" />
          </svg>
          <span className={s.pinMe} />
          <span className={s.pinDonor} />
          <span className={s.pinNgo} />
          <div className={s.status}>
            <span>9:41</span>
            <span className={s.island} />
            <span className={s.battery} />
          </div>
          <div className={s.top}>
            <span className={s.avatar}>R</span>
            <span className={s.online}>
              <span className={s.onlineDot} />
              Online
            </span>
            <span className={s.chip}>
              <strong>42</strong> meals
            </span>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.head}>
            <span className={s.tag}>New pickup</span>
            <span className={s.timer}>25m left</span>
          </div>

          <div className={s.food}>
            <img className={s.thumb} src="/food/biryani.jpg" alt="" width={56} height={56} />
            <span className={s.foodText}>
              <strong>Veg biryani</strong>
              <span>24 meals, 6 kg</span>
              <span>Anbu Illam asked for this</span>
            </span>
          </div>

          <ol className={s.route}>
            <li>
              <span className={s.dot} />
              <span className={s.stopText}>
                <em>Pick up</em>
                <strong>Kalyan Mahal</strong>
              </span>
              <span className={s.km}>1.2 km</span>
            </li>
            <li>
              <span className={s.square} />
              <span className={s.stopText}>
                <em>Drop</em>
                <strong>Anbu Illam</strong>
              </span>
              <span className={s.km}>2.1 km</span>
            </li>
          </ol>

          <div className={s.actions}>
            <span className={s.skip}>Skip</span>
            <span className={s.accept}>Accept, about 14 min</span>
          </div>
        </div>
      </div>
    </figure>
  );
}
