import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8">Spardavel</h1>
      <p className="text-lg">Welcome to your savings tracker!</p>
    </div>
  )
}
