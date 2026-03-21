type BrandBadgeProps = {
  className?: string
  label?: string
}

function BrandBadge({
  className = '',
  label = 'tvprograms.tech',
}: BrandBadgeProps) {
  const classes = ['brand-badge', className].filter(Boolean).join(' ')

  return (
    <a
      href='https://tvprograms.tech'
      target='_blank'
      rel='noreferrer'
      className={classes}
    >
      <img src='https://tvprograms.tech/tv.svg' alt='' className='brand-badge-icon' />
      <span>{label}</span>
    </a>
  )
}

export default BrandBadge
