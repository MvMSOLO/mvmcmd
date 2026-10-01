// MVMCMD 3D asset: boot screen cube
const c = box(26,26,26,true).fillet(3.0).color('#c8ccd4');
const inlay = box(14,14,14,true).fillet(1.5).translate(0,0,2.5).color('#8b948f');
const core = cylinder(5,3,16).translate(0,0,10).color('#18181c');
return c.union(inlay,core);
