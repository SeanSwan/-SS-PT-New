import type React from "react"
import { ThemeProvider } from "styled-components"
import GlobalStyles from "../../styles/GlobalStyle"

const theme = {
  colors: {
    neonBlue: "#00ffff",
    royalPurple: "#6a0dad",
    grey: "#808080",
    silver: "#c0c0c0",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <body>{children}</body>
      </ThemeProvider>
    </html>
  )
}

