

//See https://dontpaniclabs.com/blog/post/2015/08/04/github-electron-tutorial-using-electron-boilerplate/
//See also https://nodejs.org/dist/latest-v5.x/docs/api/modules.html#modules_accessing_the_main_module


//Just testing use of modules called from other modules


exports.checkAllPaths = () => console.log("moved checkAllPaths");

const PI = Math.PI;

exports.area = (r) => PI * r * r;

exports.circumference = (r) => 2 * PI * r;