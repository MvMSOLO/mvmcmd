// MVMCMD 3D asset: settings/status indicator
const orb = box(14,14,14,true).fillet(3).color('#aeb7b2');
const outer = torus(12,1,24).rotateX(66).color('#9aaa96');
return orb.union(outer);
