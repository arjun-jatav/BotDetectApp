import React from 'react';
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface SiloSvgProps {
  width: number;
  height: number;
}

export function SiloSvg({ width, height }: SiloSvgProps) {
  // Rivet y coordinates on the left (x = 2.88955) and right (x = 352.204)
  const rivetYList = [
    158.89, 164.669, 170.448, 176.227, 182.006, 187.785, 193.564, 199.343,
    205.122, 210.902, 216.681, 222.46, 228.239, 234.018, 239.797, 245.576,
    251.355, 257.134, 262.913, 268.693, 274.472, 280.251, 286.03, 291.809,
    297.588, 303.367, 309.146, 314.925, 320.704, 326.484, 332.263, 338.042,
    343.821, 349.6, 355.379, 361.158, 366.937, 372.717, 378.496, 384.275,
    390.054, 395.833, 401.612, 407.391,
  ];

  return (
    <Svg width={width} height={height} viewBox="0 0 356 810" fill="none">
      <Defs>
        <LinearGradient id="silo_paint0" x1="178.802" y1="415.44" x2="178.802" y2="682" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#818181" />
          <Stop offset="1" stopColor="white" />
        </LinearGradient>

        <LinearGradient id="silo_stripes" x1="2.84326" y1="0" x2="351.95" y2="0" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#696969" />
          <Stop offset="0.5045" stopColor="#DEDEDE" />
          <Stop offset="1" stopColor="#696969" />
        </LinearGradient>

        <LinearGradient id="silo_roof" x1="5.136" y1="82.308" x2="349.315" y2="82.308" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#8D8D8D" />
          <Stop offset="0.543" stopColor="#EDEDED" />
          <Stop offset="1" stopColor="#8D8D8D" />
        </LinearGradient>

        <LinearGradient id="silo_topcap" x1="141.542" y1="6.484" x2="214.744" y2="6.484" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#8E8E8E" />
          <Stop offset="0.5045" stopColor="#DEDEDE" />
          <Stop offset="1" stopColor="#8E8E8E" />
        </LinearGradient>

        <LinearGradient id="silo_bottomchute" x1="0" y1="5.137" x2="77.054" y2="5.137" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#696969" />
          <Stop offset="0.5045" stopColor="#DEDEDE" />
          <Stop offset="1" stopColor="#696969" />
        </LinearGradient>
      </Defs>

      {/* Rivets Left */}
      {rivetYList.map((y, i) => (
        <Circle key={`rivet-l-${i}`} cx={2.88955} cy={y} r={2.88955} fill="black" />
      ))}

      {/* Rivets Right */}
      {rivetYList.map((y, i) => (
        <Circle key={`rivet-r-${i}`} cx={352.204} cy={y} r={2.88955} fill="black" />
      ))}

      {/* Hopper Cone */}
      <Path d="M139.28 682H215.748L341.726 418.381L10.7261 417L139.28 682Z" fill="url(#silo_paint0)" />
      <Path d="M139.602 682.632L11.1909 417.951" stroke="black" />
      <Path d="M214.841 683L341.242 417.951" stroke="black" />
      <Path d="M199.217 682.632L288.313 415.759" stroke="black" />
      <Path d="M177.385 682.632V415.875" stroke="black" />
      <Path d="M156.529 682.632L58.3403 417.143" stroke="black" />

      {/* Cylinder Corrugated Body Stripes */}
      <Rect width={348.031} height={2.76814} x={2.84326} y={415.875} fill="black" />
      {[
        156.278, 161.676, 167.278, 172.881, 178.484, 184.086, 189.689, 195.292,
        200.895, 206.497, 212.1, 217.703, 223.305, 228.908, 234.511, 240.114,
        245.716, 251.319, 256.922, 262.524, 268.127, 273.73, 279.332, 284.935,
        290.538, 296.141, 301.743, 307.346, 312.949, 318.552, 324.154, 329.757,
        335.36, 340.962, 346.565, 352.168, 357.771, 363.373, 368.976, 374.579,
        380.181, 385.784, 391.387, 396.99, 402.592, 406.99,
      ].map((y, idx) => (
        <Rect
          key={`stripe-${idx}`}
          x={2.84326}
          y={y}
          width={349.107}
          height={5.60272}
          fill={idx % 2 === 0 ? '#E0E0E0' : 'url(#silo_stripes)'}
        />
      ))}

      <Rect x={2.67188} y={291.239} width={349.107} height={1.86757} fill="black" />
      <Rect x={2.67188} y={412.631} width={349.107} height={1.86757} fill="black" />
      <Rect x={44.9199} y={162.376} width={130.73} height={2.51156} transform="rotate(90 44.9199 162.376)" fill="black" />
      <Rect x={312.043} y={162.376} width={130.73} height={2.51156} transform="rotate(90 312.043 162.376)" fill="black" />
      <Rect x={44.9482} y={315.089} width={101.455} height={2.56849} transform="rotate(90 44.9482 315.089)" fill="black" />
      <Rect x={312.071} y={315.089} width={101.455} height={2.56849} transform="rotate(90 312.071 315.089)" fill="black" />
      <Rect x={178.785} y={292.692} width={120.719} height={2.56849} transform="rotate(90 178.785 292.692)" fill="black" />
      <Path d="M6.55664 411.123H349.155" stroke="black" strokeDasharray="5 4" />

      {/* Roof Cone */}
      <Path d="M142.532 12.4207H214.487L351.516 152.196H2.84326L142.532 12.4207Z" fill="url(#silo_roof)" />
      <Path d="M142.184 12.2485L3.92725 150.655" stroke="black" />
      <Path d="M213.46 12.2485L350.525 150.655" stroke="black" />
      <Path d="M198.691 12.2485L328.087 152.22" stroke="black" />
      <Path d="M185.848 12.2485L251.033 152.22" stroke="black" />
      <Path d="M157.595 12.2485L41.7188 150.779" stroke="black" />
      <Path d="M170.437 12.2485L118.773 152.22" stroke="black" />

      <Rect x={3.17188} y={149.589} width={348.315} height={6.20491} fill="#B2B2B2" stroke="black" />
      <Rect x={142.042} y={0.5} width={72.2021} height={11.9688} fill="url(#silo_topcap)" stroke="black" />
      <Rect x={143.168} y={5.76392} width={69.9486} height={1.44098} fill="black" />

      {/* Discharge Spout */}
      <Rect x={138.973} y={683} width={76.0548} height={9.27403} fill="url(#silo_bottomchute)" stroke="black" />
      <Rect x={138.973} y={688.137} width={75.7705} height={1.28425} fill="black" />
      <Rect x={46.0205} y={679} width={267} height={4} fill="black" />
      <Rect x={156.678} y={683} width={42.3801} height={1.28425} fill="#D9D9D9" />
      <Rect x={157.062} y={681} width={42} height={2} fill="white" />

      {/* Diagonal Support Bracing */}
      <Rect x={60.9058} y={579.21} width={300.475} height={3.63699} transform="rotate(39 60.9058 579.21)" fill="#ACACAC" stroke="black" strokeWidth={1.5} />
      <Rect x={-0.110869} y={1.05485} width={301.271} height={3.63699} transform="matrix(-0.777146 0.62932 0.62932 0.777146 291.395 580.762)" fill="#ACACAC" stroke="black" strokeWidth={1.5} />

      {/* Support Columns / Legs */}
      <Rect x={54.2261} y={415.195} width={11.8425} height={394.305} fill="white" stroke="black" />
      <Rect x={287.226} y={415.195} width={11.8425} height={394.305} fill="white" stroke="black" />
      <Path d="M258.726 404V418.5L271.726 434.5H329.726L335.726 418.5V404H258.726Z" fill="#D9D9D9" stroke="black" />
      <Path d="M94.7261 404V418.5L81.7261 434.5H23.7261L17.7261 418.5V404H94.7261Z" fill="#D9D9D9" stroke="black" />
      <Rect x={302.226} y={415.195} width={11.8425} height={394.305} fill="white" stroke="black" />
      <Rect x={39.2261} y={415.195} width={11.8425} height={394.305} fill="white" stroke="black" />

      {/* Mounting Bolt Points */}
      <Circle cx={278.226} cy={414.5} r={1.5} fill="black" />
      <Circle cx={278.226} cy={430.5} r={1.5} fill="black" />
      <Circle cx={28.2261} cy={414.5} r={1.5} fill="black" />
      <Circle cx={28.2261} cy={430.5} r={1.5} fill="black" />
    </Svg>
  );
}
