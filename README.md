# Project Title: Rotato Road Rhythm – 3D Traffic Simulation

## 1. Project Overview
This project is an interactive, web-based 3D simulation that models traffic behavior and car movement using Three.js within a React application. The system simulates automated car movement, basic traffic logic, and dynamic environmental effects in a visually rich city intersection. The goal is to apply theoretical knowledge of 3D graphics and web development into a practical, engaging application that demonstrates both fundamental and advanced Three.js concepts.

## 2. Objectives
- Simulate car movement, direction changes, and collision avoidance at an intersection.
- Visualize realistic traffic scenarios using 3D modeling and animation.
- Enable user interaction for camera control and environment toggling (day/night mode).
- Implement multiple camera views (orbit, top, street) for enhanced immersion.
- Use lighting and textures to create a visually compelling environment.

## 3. Tools and Technologies
- **Three.js**: For 3D rendering and scene management
- **React**: UI framework for component-based development
- **TypeScript**: For type safety and maintainability
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: For rapid UI styling
- **VS Code**: Development environment
- **GitHub**: Version control and project collaboration
- **Netlify / Vercel / GitHub Pages**: For project deployment

## 4. Technical Requirements & Implementation Plan
- **Minimum of 5 Unique 3D Objects:**
  - Cars, roads, buildings, traffic lights, trees, and street lights are modeled in the scene.
- **Camera Controls:**
  - Orbit, top-down, and street-level camera modes are implemented. Mouse drag and scroll allow for interactive navigation.
- **Lighting:**
  - Ambient, directional (sun), and point lights (street lights) are used. Night mode toggles lighting for realism.
- **User Interaction:**
  - Users can switch camera modes and toggle day/night environment. (Manual car control can be added as an extension.)
- **Texture Mapping / Materials:**
  - SVG-based and image textures are used for roads, grass, and building windows. Materials are tuned for realism.
- **Animations:**
  - Cars move according to traffic light logic, trees sway, and traffic lights animate through their states.

## 5. Deployment
The final application can be hosted online via Netlify, Vercel, or GitHub Pages. The repository includes:
- Full source code with documentation
- A demo video (optional)

## 6. Deliverables
- Source code with modular comments and organized file structure
- 3D assets (procedurally generated in code)
- Textures for realism (roads, buildings, props)
- Playable demo hosted publicly
- README file with:
  - Simulation instructions
  - Controls guide
  - Asset credits and setup notes

## 7. Risks and Mitigations
| Risk                      | Mitigation                                                      |
|---------------------------|-----------------------------------------------------------------|
| Car/traffic logic complexity | Use simplified movement and collision logic for stability        |
| Performance bottlenecks   | Use low-res textures, minimal shadows, and optimize rendering    |
| Limited time              | Prioritize interactivity and visuals; treat extensions as stretch goals |

## 8. Success Criteria
- 5+ unique 3D objects are modeled and textured
- Cars move and obey traffic lights, avoiding collisions
- Camera switches between orbit, top, and street views
- Night mode and lighting effects are visually clear
- Demo works in modern browsers and runs smoothly on average devices
- Documentation and code are clear, commented, and accessible

## 9. Conclusion
The Rotato Road Rhythm project demonstrates a practical and engaging application of 3D web technologies using Three.js and React. By integrating car movement, interactive controls, and dynamic traffic behavior, the project showcases an understanding of core 3D concepts and the ability to simulate real-world systems in a web environment. This documentation outlines a structured approach to developing the application using collaborative tools and best practices.

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/cca2056c-8c69-440a-b0cd-903d95e8419c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/cca2056c-8c69-440a-b0cd-903d95e8419c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/cca2056c-8c69-440a-b0cd-903d95e8419c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
