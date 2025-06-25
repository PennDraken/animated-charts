// INIT
// ----------------------------------------------------------------------------------------------------------
// Load browser data into textboxes if stored

const xTextArea = document.getElementById("plot-x-text-area");
const yTextArea = document.getElementById("plot-y-text-area");
const unitTextInput = document.querySelector("input");
const targetAmountInput = document.getElementById("target-amount-input");


const plotButton = document.getElementById("plot-button");

const chartCanvas = document.getElementById("chart-canvas");


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

plotButton.addEventListener("click", async () => {
    animate_chart();
});

async function animate_chart() {
    // Save input data to local browser storage
    const unitText = unitTextInput.value;
    const targetAmount = targetAmountInput.value;
    // Parse yValues
    const yValues = yTextArea.value
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "")
        .map(Number)
        .filter(n => !isNaN(n));
    const xValues = xTextArea.value
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "")
        .map(Number)
        .filter(n => !isNaN(n));

    // Generate xValues (e.g., 100, 110, 120, ...)
    // Animate plotting one point at a time
    const totalTime = 3; // seconds
    const fps = 30;
    for (let t = 0; t <= 1; t += 1 / (totalTime * fps)) {
        plot_chart(xValues, yValues, chartCanvas, targetAmount, unitText, t);
        await sleep(1000 / fps);
    }
    plot_chart(xValues, yValues, chartCanvas, targetAmount, unitText, 1);

}

function smoothstep(f) {
  return 3 * f * f - 2 * f * f * f;
}

function plot_chart(xValues, yValues, canvas, targetAmount, unit = "kg", t=0) {
    const ctx = canvas.getContext("2d");

    // Handle high-DPI screens
    const dpr = window.devicePixelRatio || 1;
    const styleWidth = canvas.clientWidth;
    const styleHeight = canvas.clientHeight;

    canvas.width = styleWidth * dpr;
    canvas.height = styleHeight * dpr;
    ctx.scale(dpr, dpr); // scale all drawings

    const width = styleWidth;
    const height = styleHeight;

    // Clear previous drawing
    ctx.clearRect(0, 0, width, height);

    const maxY = Math.max(...yValues.concat(targetAmount));
    const minY = Math.min(...yValues);
    const minX = Math.min(...xValues);
    const padding = 40;
    const xSpacing = (width - 2 * padding) / (xValues[xValues.length - 1] - xValues[0]);
    const yScale = (height - 2 * padding) / (maxY - minY);

    
    // Linear interpolation
    // const maxX = minX + (Math.max(...xValues) - minX) * t; 

    // Constant time between each point
    const N = xValues.length;
    const scaledT = t * (N );  // scale t to [0, N - 1)
    const maxXIndex = Math.floor(scaledT); // index of the left point
    let f = scaledT - maxXIndex;         // fractional part between i and i+1
    // f = smoothstep(f);
    const maxX = xValues[maxXIndex] + f * (xValues[maxXIndex + 1] - xValues[maxXIndex]);    


    // Background bars
    const yIncrement = 20;
    for (let y = minY; y < maxY; y += yIncrement) {
        ctx.strokeStyle = "lightgray";
        ctx.beginPath();
        ctx.lineWidth = 1;

        const yScreen = height - padding - (y - minY) * yScale;
        ctx.moveTo(padding, yScreen);
        ctx.lineTo(width, yScreen);
        ctx.stroke();
    }


    // Line
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    for (let i=0;i<xValues.length;i++) {
        const xVal = xValues[i];
        const x = padding + (xVal - xValues[0]) * xSpacing;
        const y = height - padding - (yValues[xValues.indexOf(xVal)] - minY) * yScale;
        if (xVal > maxX && i > 0) {
            // Truncate line if point is beyond maxX
            // Interpolate between the two points
            const realgradient = (yValues[i] - yValues[i-1])/(xValues[i] - xValues[i-1]);
            const predictedY   = realgradient * (maxX - xValues[i-1]) + yValues[i-1];
            // Convert to on screen coordinates
            const screenX = padding + (maxX - xValues[0]) * xSpacing;
            const screeny = height - padding - (predictedY - minY) * yScale;
            ctx.lineTo(screenX, screeny);
            break;
        } else {
            // Regular draw
            if (xValues.indexOf(xVal) === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    }
    ctx.stroke();

    // Goal weight
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.setLineDash([5, 10]);
    const x = padding;
    const y = height - padding - (260 - minY) * yScale;
    ctx.moveTo(x, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    // Text and dots
    ctx.fillStyle = "#000";
    for (const xVal of xValues) {
        if (xVal >= maxX + 0.001) { // Only plots point after theyre visible (by t)
            break;
        }
        let circleR = 8;
        let fontSize = 20;
        if (maxXIndex === xValues.indexOf(xVal)) {
            fontSize = fontSize * f;
            circleR = circleR * f;
        }

        const x = padding + (xVal - xValues[0]) * xSpacing;
        const y = height - padding - (yValues[xValues.indexOf(xVal)] - minY) * yScale;
        ctx.beginPath();
        ctx.arc(x, y, circleR, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = fontSize + "px Arial";
        ctx.fillText(`${yValues[xValues.indexOf(xVal)]} ${unit}`, x - 10, y - circleR*4);
    }
}

plot_chart([1, 2, 3, 4, 5], [110, 130, 150, 160, 170], chartCanvas, 260);
