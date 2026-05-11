const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '../node_modules/react-native-call-detector/android/build.gradle');

if (fs.existsSync(gradlePath)) {
    let content = fs.readFileSync(gradlePath, 'utf8');
    
    // Fix compile vs implementation
    content = content.replace(/compile\s+'com.facebook.react:react-native:\+'/g, "implementation 'com.facebook.react:react-native:+'");
    
    // Fix old SDK versions to match project (Compile: 36, Target: 36)
    content = content.replace(/compileSdkVersion\s+23/g, "compileSdkVersion 36");
    content = content.replace(/targetSdkVersion\s+22/g, "targetSdkVersion 36");
    content = content.replace(/buildToolsVersion\s+"23.0.1"/g, 'buildToolsVersion "36.0.0"');

    // Remove jcenter() as it's deprecated and can cause issues
    content = content.replace(/jcenter\(\)/g, "google()\n    mavenCentral()");

    fs.writeFileSync(gradlePath, content);
    console.log('Successfully patched react-native-call-detector/android/build.gradle');
} else {
    console.log('Could not find react-native-call-detector/android/build.gradle');
}
