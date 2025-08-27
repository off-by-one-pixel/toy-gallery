import { Metadata } from "next"
import '../styles/index.css';

export const metadata: Metadata = {
  title: 'Cone Visualization',
  description: 'Cone Visualization - A React application for visualizing cone measurements',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                <meta name="theme-color" content="#000000" />
            </head>
            <body className="bg-gray-200 min-h-screen">
                <main>{children}</main>
            </body>
        </html>
    )
}