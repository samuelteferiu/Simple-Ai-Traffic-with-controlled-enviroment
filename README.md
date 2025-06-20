# How to Run the Project (VS Code)

1. **Clone or Download the Repository**
   - Use `git clone <repo-url>` or download and unzip the project folder.

2. **Open in VS Code**
   - Open the project root folder in Visual Studio Code.

3. **Install Dependencies**
   - Open a terminal in VS Code and run:
     ```bash
     npm install
     ```

4. **Start the Development Server**
   - Run:
     ```bash
npm run dev
```
   - The app will be available at the local address shown in the terminal (usually http://localhost:5173/).

5. **View and Edit the Code**
   - Main code is in `src/components/TrafficScene.tsx`.
   - UI and styles are in `src/` and `src/components/ui/`.

---

# Code Hints & Customization Clues

- **Change the Road Texture:**
  - Go to `src/components/TrafficScene.tsx`, find the `createRoadSystem` function.
  - Look for the SVG code in the `roadTexture` definition. Edit the SVG to change the road appearance.

- **Adjust Car Speed:**
  - In `TrafficScene.tsx`, find the `createCar` function.
  - Change the `speed` property in the returned object (e.g., `speed: 8`).

- **Modify Car or Road Colors:**
  - Car body/roof color: In `createCar`, edit the `color` property of `bodyMaterial` and `roofMaterial`.
  - Road color: In the SVG for `roadTexture` in `createRoadSystem`.

- **Change Grass Appearance:**
  - In `createRoadSystem`, look for the `grassTexture` SVG and edit its color or pattern.

- **Add/Remove 3D Objects:**
  - Buildings: `createBuildings` function.
  - Trees: `createTrees` function.
  - Street lights: `createStreetLights` function.

- **Camera Controls:**
  - Camera logic is in `updateCameraControls` and the control panel in the React JSX at the bottom of `TrafficScene.tsx`.

- **Traffic Light Logic:**
  - See the timer and state logic in the main `useEffect` and the `updateTrafficLightAppearance` function.

- **Change which side of the road cars drive on (e.g., horizontal cars):**
  - In `src/components/TrafficScene.tsx`, see the `createCar` and `resetCar` functions.
  - Adjust the `startPosition` for `east` and `west` directions (e.g., `startPosition.set(-16, 0, 2)` for eastbound, `startPosition.set(16, 0, -2)` for westbound) to place cars in the correct lane.

For more details, see the comments in the code. Most visual and logic changes can be made in `src/components/TrafficScene.tsx`.
