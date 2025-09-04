class MatterMath {
    constructor() {
        this.timescale = 1; // Timescale variable
    }

    /*
      Some basic and advanced math functions
    */
    //this.time = time();

    // We all know what pi() is
    pi() {
        return (Math.PI); // PI
    }

    pi2() {
        return (Math.PI * 2);
    }

    // Get the current time in a long number
    time() {
        return (new Date().getTime()); // Get the current time, can be good for random number functions
    }

    // Delta time. Set a floating number to change the rate at which delta time is calculated(0.1 is default)
    dt(rate = 0.1) {
        return ((1000 / 60) * this.timescale * rate);
    }

    setTimescale(timescale) {
        this.timescale = timescale;
    }

    getTimescale() {
        return (this.timescale);
    }

    ts() {
        return (this.timescale);
    }

    // ARRAY STUFF

    // Create a new list
    listCreate() {
        var arr = [];

        return (arr);
    }

    // Add to the list
    listAdd(id, value) {
        id.push(value);
    }

    // Set an item to a certain value in the list
    listSet(id, pos, value) {
        id[pos] = value;
    }

    // Get the value of an item in the list
    listGet(id, pos) {
        return (id[pos]);
    }

    // Create and initialize a 2d array
    array2dCreate(width, height, defaultValue) {
        var arr = [];

        for (var i = 0; i < width; i += 1) {
            for (var j = 0; j < height; j += 1) {
                arr.push([i, j]);
                arr[i][j] = defaultValue;
            }
        }

        return (arr);
    }

    // Set the value of the 2d array
    array2dSet(array, x, y, value) {
        array[x][y] = value;
    }

    // Get the value of the 2d array
    array2dGet(array, x, y) {
        return (array[x][y]);
    }

    // Create and initialize a 2d array
    array3dCreate(width, height, depth, defaultValue) {
        var arr = [];

        for (var i = 0; i < width; i += 1) {
            for (var j = 0; j < height; j += 1) {
                for (var f = 0; f < depth; f += 1) {
                    arr.push([i, j, f]);
                    arr[i][j][f] = defaultValue;
                }
            }
        }

        return (arr);
    }

    // Set the value of the 2d array
    array3dSet(array, x, y, z, value) {
        array[x][y][z] = value;
    }

    // Get the value of the 2d array
    array3dGet(array, x, y, z) {
        return (array[x][y][z]);
    }

    // Clear the array
    arrayClear(array) {
        array = [];

        return (array);
    }

    // MATH STUFF

    // Returns the cosine of a number from degrees to radians
    dcos(x) {
        return (Math.cos(this.degtorad(x)));
    }

    // Returns degrees to radians
    degtorad2 = function () {
        return ((this.pi() * 2) / -360);
    }

    // Returns degrees to radians
    degtorad(x) {
        return (x * this.pi() / 180);
    }

    // Returns radians to degrees
    radtodeg(x) {
        return (x * 180 / this.pi());
    }

    // Snap a position to a grid position. Position being for example, an x or y position
    snap(position, grid_size) {
        return (floor(position / grid_size) * grid_size);
    }

    // Return the distance between 2 points
    pointDistance(x1, y1, x2, y2) {
        var a = (x1) - (x2);
        var b = (y1) - (y2);
        return (Math.sqrt((a * a) + (b * b)));
    }

    // Return the direction from one point to another
    pointDirection(x1, y1, x2, y2) {
        var xdiff = (x2) - x1;
        var ydiff = (y2) - y1;

        return (-(Math.atan2(ydiff, xdiff) * 180.0 / Math.PI));
    }

    angleDifference(angle1, angle2) {
        // Normalize angles to the range [0, 360)
        const normalizedAngle1 = (angle1 % 360 + 360) % 360;
        const normalizedAngle2 = (angle2 % 360 + 360) % 360;

        // Calculate the absolute difference
        let diff = Math.abs(normalizedAngle1 - normalizedAngle2);

        // Ensure the result is within the range [0, 180)
        if (diff > 180) {
            diff = 360 - diff;
        }

        return diff;
    }

    // Returns the length and direction on the x axis
    lengthDirX(length, direction) {
        return (length * Math.cos(direction * this.degtorad2()));
    }

    // Returns the length and direction on the y axis
    lengthDirY(length, direction) {
        return (length * Math.sin(direction * this.degtorad2()));
    }

    // Lerp a value towards another value
    lerp(from, to, amount) {
        return (from + amount * (to - from));
    }

    // Returns a random floating point from 1 to max value
    random(max) {
        return ((Math.random() * max) + 1);
    }

    // Returns a random floating point from min to max value
    randomRange(min, max) {
        return (Math.random() * (max - min) + min);
    }

    // Returns a random integer from 1 to max value
    irandom(max) {
        return (Math.floor((Math.random() * max) + 1));
    }

    // Returns a random integer from min to max value
    irandomRange(min, max) {
        return (Math.floor(Math.random() * (max - min) + min));
    }

    // Returns either true or false
    randomBool() {
        return (Math.random() >= 0.5);
    }

    // Choose a random item out of a bunch of given items
    choose(...items) {
        if (items.length === 0) {
            throw new Error('No items provided to choose from.');
        }
        const randomIndex = Math.floor(Math.random() * items.length);

        return items[randomIndex];
    }

    // Replace every occurance of a string inside another string
    stringReplaceAll(str, find, replace) {
        return (str.replace(new RegExp(escapeRegExp(find), 'g'), replace));
    }

    // Returns a value to a string
    toString(val) {
        return (val.toString());
    }

    // Converts a string to an integer
    toInt(val) {
        return (parseInt(val));
    }

    // Returns a value pulsing at the rate of delay to a maximum number
    /*
        var red = pulse(10, 255);
    */
    sine(delay, max) {
        var time = this.time();
        var val = Math.sin(time / delay) * max;

        return (val);
    }

    // Returns a value pulsing at the rate of delay from 0 to a maximum number
    sinePositive(delay, max) {
        var val = Math.sin(this.time() / delay) * max;
        return (keepPositive(val));
    }

    // Returns a value pulsing at the rate of delay from 0 to a maximum number
    sineNegative(delay, max) {
        var val = Math.sin(this.time() / delay) * max;
        return (keepNegative(val));
    }

    // Linear interpolation function
    interpolate(start, end, t) {
        return start + (end - start) * t;
    }

    // Smoothstep interpolation function
    smoothstep(t) {
        return t * t * (3 - 2 * t);
    }

    // Sine interpolation function
    sineInterpolation(t) {
        return 0.5 - 0.5 * Math.cos(Math.PI * t);
    }

    // Clamp a value to a max and min value
    clamp(value, min, max) {
        if (value > max) { value = max; }
        if (value < min) { value = min; }

        return (value);
    }

    // Return a number that is always positive
    keepPositive(x) {
        if (x < 0) {
            x *= -1;
        }

        return (x);
    }

    // Return a number that is always negative
    keepNegative(x) {
        if (x > 0) {
            x *= -1;
        }

        return (x);
    }

    // Rotate an angle smoothly towards another angle
    rotateSmooth(direction, targetDirection, speed) {
        let delta = targetDirection - direction;

        delta = ((delta + 360) % 360 - 180);

        const rotateDirection = delta > 0 ? 1 : -1;

        let rotationAmount = rotateDirection * Math.min(Math.abs(delta), speed);

        direction = ((direction + (rotationAmount + 360)) % 360);
        //console.log(direction);

        return (direction);
    }

    // Execute javascript code from a string
    executeString(string) {
        try {
            eval(string);
        } catch (error) {
            console.error("Error executing string:", error);
        }
    }

    // Get color from rgb color values
    rgb(r, g, b) {
        r = Math.floor(r);
        g = Math.floor(g);
        b = Math.floor(b);
        return ["rgb(", r, ",", g, ",", b, ")"].join("");
    }

    hsl(h, s, l) {
        r = Math.floor(h);
        g = Math.floor(s) * 100;
        b = Math.floor(l) * 100;
        return ["hsl(", r, ",", g, "%,", b, "%)"].join("");
    }
}

window.MatterMath = new MatterMath(); // Make available globally
window.matterMath = new MatterMath(); // Make available globally