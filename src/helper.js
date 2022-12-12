
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: parseInt(result[4], 16)
    } : null;
}

function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();

    // Change this to div.childNodes to support multiple top-level nodes.
    return div.firstChild;
}

function lerpColor(c1, c2, r) {
    return {
        r: (c1.r * (1 - r)) + c2.r * r,
        g: (c1.g * (1 - r)) + c2.g * r,
        b: (c1.b * (1 - r)) + c2.b * r,
        a: (c1.a * (1 - r)) + c2.a * r,
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
