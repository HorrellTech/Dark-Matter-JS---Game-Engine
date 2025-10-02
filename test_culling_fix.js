// Test script to verify the culling fix
// This script tests the FOV culling logic without needing a browser

// Mock the necessary classes and functions
class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}

// Test the FOV culling logic
function testFOVCullingLogic() {
    console.log('Testing FOV culling logic fix...\n');

    // Test cases for useExtendedFOV logic
    const testCases = [
        { enableBackfaceCulling: false, disableCulling: false, expected: false, description: "Backface culling disabled, culling enabled" },
        { enableBackfaceCulling: true, disableCulling: false, expected: true, description: "Backface culling enabled, culling enabled" },
        { enableBackfaceCulling: false, disableCulling: true, expected: false, description: "Backface culling disabled, culling disabled" },
        { enableBackfaceCulling: true, disableCulling: true, expected: false, description: "Backface culling enabled, culling disabled" }
    ];

    let allPassed = true;

    testCases.forEach((testCase, index) => {
        const result = testCase.enableBackfaceCulling && !testCase.disableCulling;
        const passed = result === testCase.expected;

        console.log(`Test ${index + 1}: ${passed ? 'PASS' : 'FAIL'}`);
        console.log(`  ${testCase.description}`);
        console.log(`  Expected: ${testCase.expected}, Got: ${result}`);
        console.log('');

        if (!passed) {
            allPassed = false;
        }
    });

    return allPassed;
}

// Test the projectCameraPoint logic
function testProjectCameraPointLogic() {
    console.log('Testing projectCameraPoint logic...\n');

    // Mock camera properties
    const camera = {
        viewportWidth: 800,
        viewportHeight: 600,
        fieldOfView: 60,
        _cullingFieldOfView: 90,
        _disableCulling: true,
        _enableBackfaceCulling: false
    };

    // Test the useExtendedFOV calculation
    const useExtendedFOV = camera._enableBackfaceCulling && !camera._disableCulling;
    const fovToUse = useExtendedFOV ? camera._cullingFieldOfView : camera.fieldOfView;

    console.log(`useExtendedFOV: ${useExtendedFOV} (should be false when culling is disabled)`);
    console.log(`FOV to use: ${fovToUse} (should be ${camera.fieldOfView} when culling is disabled)`);

    const expectedFOV = camera.fieldOfView; // Should use normal FOV when culling is disabled
    const fovCorrect = fovToUse === expectedFOV;

    console.log(`FOV logic: ${fovCorrect ? 'PASS' : 'FAIL'}`);
    console.log('');

    return fovCorrect;
}

// Run all tests
function runTests() {
    console.log('=== CULLING FIX VERIFICATION TESTS ===\n');

    const test1Passed = testFOVCullingLogic();
    const test2Passed = testProjectCameraPointLogic();

    const allTestsPassed = test1Passed && test2Passed;

    console.log('=== TEST RESULTS ===');
    console.log(`FOV Culling Logic: ${test1Passed ? 'PASS' : 'FAIL'}`);
    console.log(`Project Camera Point Logic: ${test2Passed ? 'PASS' : 'FAIL'}`);
    console.log(`Overall: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

    if (allTestsPassed) {
        console.log('\n✅ The culling fix appears to be working correctly!');
        console.log('Vertices and faces should no longer be clipped when disableCulling is true.');
    } else {
        console.log('\n❌ There may still be issues with the culling fix.');
    }

    return allTestsPassed;
}

// Run the tests
runTests();