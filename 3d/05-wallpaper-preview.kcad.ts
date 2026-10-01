// MVMCMD 3D asset: wallpaper preview stage
const plane = box(34,3,24,true).fillet(2).color('#9da69f');
const frame = box(29,2,19,true).fillet(1.4).translate(0,2.6,0).color('#d2d5ca');
const marker = cylinder(3,4,16).translate(0,5,0).color('#8b948f');
return plane.union(frame,marker);
