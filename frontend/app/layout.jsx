import './globals.css'

export const metadata = {
  title: 'Profile App',
  description: 'User profile management application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

