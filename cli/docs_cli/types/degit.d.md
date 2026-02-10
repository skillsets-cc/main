# types/degit.d.ts

## Purpose
TypeScript type declarations for the `degit` package. Provides type safety for the third-party degit library used to extract repository subfolders without .git metadata.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `degit` | function | Factory function that returns an Emitter for cloning repositories |
| `DegitOptions` | interface | Configuration options for degit behavior |
| `Emitter` | interface | Object with clone method and event listeners |

## Dependencies
- Internal: None
- External: `degit` package (types only, no runtime import)

## Integration Points
- Used by: `commands/install.ts`, `commands/init.ts` (via degit import)

## Key Logic

### DegitOptions
```typescript
interface DegitOptions {
  cache?: boolean;    // Enable local caching of repo
  force?: boolean;    // Overwrite existing files
  verbose?: boolean;  // Log detailed progress
}
```

### Emitter Interface
```typescript
interface Emitter {
  clone(dest: string): Promise<void>;                          // Extract to destination
  on(event: string, callback: (info: unknown) => void): void;  // Event listeners
}
```

### Usage Pattern
```typescript
import degit from 'degit';

const emitter = degit('skillsets-cc/main/skillsets/@user/name', {
  cache: false,  // Disable caching for fresh installs
  force: false   // Prevent accidental overwrites
});

await emitter.clone('./target-directory');
```

## Notes
- This is a `.d.ts` file (declaration only), not runtime code
- The actual `degit` package is installed as a dependency in `package.json`
- We use degit over git clone because it extracts subfolder contents without `.git` directory
- Event handling (`on` method) is not currently used in our implementation
