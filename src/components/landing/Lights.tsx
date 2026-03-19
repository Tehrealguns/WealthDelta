import { Environment } from '@react-three/drei';

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.06} color="#fffbea" />

      <directionalLight
        position={[5, 8, 3]}
        intensity={0.7}
        color="#f5d58e"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      <pointLight position={[-3, 4, -3]} intensity={0.4} color="#CA8A04" />
      <pointLight position={[4, -2, 5]} intensity={0.2} color="#e6be6a" />
      <pointLight position={[0, -3, 0]} intensity={0.15} color="#CA8A04" />

      <Environment preset="night" environmentIntensity={0.5} />
    </>
  );
}
