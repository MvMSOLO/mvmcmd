// MVMCMD 3D asset: loading/success/error status symbol base
const plate = box(18,18,3,true).fillet(2).color('#aeb7b2');
const markA = box(3,9,3,true).translate(-3,1,3).rotateZ(-42).color('#9aaa96');
const markB = box(3,13,3,true).translate(2,3,3).rotateZ(45).color('#9aaa96');
return plate.union(markA,markB);
