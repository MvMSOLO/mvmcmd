// MVMCMD 3D asset: app-card mini object
const body = cylinder(12,7,24).color('#aeb7b2');
const cap = cylinder(8,3,20).translate(0,0,5).color('#d7dacd');
const ring = torus(11,0.8,24).translate(0,0,4).color('#9aaa96');
return body.union(cap,ring);
