# UI Changes to Re-apply After Git Restore

Due to PowerShell file corruption when trying to change fonts, UIScene.js and TitleScene.js were restored from git. The following changes from this session need to be manually re-applied:

## 1. Admin Input Z-Index Fix (UIScene.js ~line 167-226)
Add `.setDepth(0)` to all admin control elements:
- `this.adminTeamText` (team selector dropdown)
- `this.adminApInput` (DOM input field)  
- Apply button
- Special Skills button

## 2. Special Skills Panel - Brown Theme (UIScene.js ~line 332-370)
Change colors to match brown theme:
- Panel background: `0x2b1d0e` (dark brown)
- Title text color: `'#deb989'` (gold)
- Button backgrounds: `0x4a3020` (brown)
- Button text: `'#deb989'` (gold)
- Panel depth: `1000`

## 3. Pink Team Color Fix (UIScene.js ~line 780-787)
Change Team 6 color from `#9C27B0` to `#ff86de`:
```javascript
case 6: return '#ff86de'; // Pink Kavatar
```

## 4. Roulette Panel - Brown Theme (UIScene.js ~line 408-422)
- Background: `0x2b1d0e, 0.95` (dark brown)
- Title color: `'#deb989'` (gold)
- Text color: `'#e0c0a0'` (light brown/tan)
- Button backgrounds: `0x4a3020` (brown)

## 5. Game Over Screen - Brown Theme + Depth (UIScene.js ~line 373-438)
- Background overlay: `0x2b1d0e, 0.95` with `.setDepth(2000)`
- Winner text color: `'#deb989'` (gold) with `.setDepth(2001)`
- Subtitle color: `'#e0c0a0'` with `.setDepth(2001)`
- Buttons: `.setDepth(2001)`
- Text stroke: `'#4a3020'` (brown), thickness 3

## 6. Special Tile Borders (HexTile.js - ALREADY DONE)
This change is in HexTile.js which was NOT affected by git restore, so it's still intact.

## Priority order:
1. Admin Input Depth (prevents overlay issues)
2. Game Over Screen Depth + Brown Theme
3. Pink Team Color
4. Special Skills Panel Brown Theme
5. Roulette Panel Brown Theme
