type WordLinkLogoProps = {
  className?: string
}

function joinClassNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ')
}

function WordLinkLogo({ className }: WordLinkLogoProps) {
  return (
    <div className={joinClassNames('wordlink-logo', className)} aria-label='WordLink'>
      <svg
        className='wordlink-logo-mark'
        viewBox='0 0 88 88'
        role='img'
        aria-hidden='true'
      >
        <rect
          x='4'
          y='4'
          width='80'
          height='80'
          rx='24'
          fill='var(--brand-shell)'
        />
        <path
          d='M35 28C44 28 48 32 48 40C48 48 51 52 60 52'
          fill='none'
          stroke='var(--brand-link)'
          strokeWidth='8'
          strokeLinecap='round'
        />
        <rect
          x='14'
          y='15'
          width='25'
          height='25'
          rx='8'
          fill='var(--brand-cream)'
        />
        <rect
          x='49'
          y='48'
          width='25'
          height='25'
          rx='8'
          fill='var(--brand-warm)'
        />
        <path
          d='M20 22L24 33L27.75 26.75L31.5 33L35 22'
          fill='none'
          stroke='var(--brand-shell)'
          strokeWidth='3.4'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M57 55V66H68'
          fill='none'
          stroke='var(--brand-shell)'
          strokeWidth='3.4'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>

      <span className='wordlink-logo-copy'>
        <span className='wordlink-logo-name'>
          <span className='wordlink-logo-word'>Word</span>
          <span className='wordlink-logo-link'>Link</span>
        </span>
      </span>
    </div>
  )
}

export default WordLinkLogo
