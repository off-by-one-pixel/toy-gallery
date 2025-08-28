# Cone Editor

A React-based cone editor component library.

## Installation

```bash
npm install cone-editor
```

## Usage

```tsx
import { ConeEditor } from 'cone-editor';

function App() {
  const handleChange = (value: string) => {
    console.log('New value:', value);
  };

  return (
    <ConeEditor
      initialValue="Initial content"
      onChange={handleChange}
    />
  );
}
```

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the library: `npm run build`
4. Run tests: `npm test`

## License

MIT
