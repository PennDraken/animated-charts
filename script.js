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
    await record_chart_animation(); // <- Use the new wrapped function
});

async function animate_chart() {
    const unitText = unitTextInput.value;
    const targetAmount = targetAmountInput.value;

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

    const totalTime = 3; // seconds
    const fps = 30;
    for (let t = 0; t <= 1; t += 1 / (totalTime * fps)) {
        plot_chart(xValues, yValues, chartCanvas, targetAmount, unitText, t);
        await sleep(1000 / fps);
    }
    plot_chart(xValues, yValues, chartCanvas, targetAmount, unitText, 1);
}

async function record_chart_animation() {
    const canvas = chartCanvas;
    const stream = canvas.captureStream(30); // 30 FPS
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    const chunks = [];
    recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    const finishedRecording = new Promise(resolve => {
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            // Automatically download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'chart-animation.webm';
            a.click();

            resolve();
        };
    });

    recorder.start();
    await animate_chart();
    recorder.stop();
    await finishedRecording;
}

function smoothstep(f) {
    return 3 * f * f - 2 * f * f * f;
}

function plot_chart(xValues, yValues, canvas, targetAmount, unit = "kg", t = 0) {
    const mainColor = "#FFF";
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const styleWidth = canvas.clientWidth;
    const styleHeight = canvas.clientHeight;

    canvas.width = styleWidth * dpr;
    canvas.height = styleHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = styleWidth;
    const height = styleHeight;

    ctx.clearRect(0, 0, width, height);

    const maxY = Math.max(...yValues.concat(targetAmount));
    const minY = Math.min(...yValues);
    const minX = Math.min(...xValues);
    const padding = 100;
    const xSpacing = (width - 2 * padding) / (xValues[xValues.length - 1] - xValues[0]);
    const yScale = (height - 2 * padding) / (maxY - minY);

    const N = xValues.length;
    const scaledT = t * (N);
    const maxXIndex = Math.floor(scaledT);
    let f = scaledT - maxXIndex;
    const maxX = xValues[maxXIndex] + f * (xValues[maxXIndex + 1] - xValues[maxXIndex]);

    const yIncrement = 20;
    for (let y = minY; y < maxY; y += yIncrement) {
        ctx.strokeStyle = "lightgray";
        ctx.beginPath();
        ctx.lineWidth = 1;

        const yScreen = height - padding - (y - minY) * yScale;
        ctx.moveTo(padding, yScreen);
        ctx.lineTo(width - padding, yScreen);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < xValues.length; i++) {
        const xVal = xValues[i];
        const x = padding + (xVal - xValues[0]) * xSpacing;
        const y = height - padding - (yValues[xValues.indexOf(xVal)] - minY) * yScale;
        if (xVal > maxX && i > 0) {
            const realgradient = (yValues[i] - yValues[i - 1]) / (xValues[i] - xValues[i - 1]);
            const predictedY = realgradient * (maxX - xValues[i - 1]) + yValues[i - 1];
            const screenX = padding + (maxX - xValues[0]) * xSpacing;
            const screeny = height - padding - (predictedY - minY) * yScale;
            ctx.lineTo(screenX, screeny);
            break;
        } else {
            if (xValues.indexOf(xVal) === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    }
    ctx.stroke();

    ctx.strokeStyle = mainColor;
    ctx.beginPath();
    ctx.setLineDash([5, 10]);
    const x = padding;
    const y = height - padding - (260 - minY) * yScale;
    ctx.moveTo(x, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();

    ctx.fillStyle = mainColor;
    for (const xVal of xValues) {
        if (xVal >= maxX + 0.001) break;

        let circleR = 8;
        let fontSize = 20;
        if (maxXIndex === xValues.indexOf(xVal)) {
            fontSize *= f;
            circleR *= f;
        }

        const x = padding + (xVal - xValues[0]) * xSpacing;
        const y = height - padding - (yValues[xValues.indexOf(xVal)] - minY) * yScale;
        ctx.beginPath();
        ctx.arc(x, y, circleR, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = fontSize + "px Arial";
        ctx.fillText(`${yValues[xValues.indexOf(xVal)]} ${unit}`, x - 20, y - circleR * 4);
    }
}

// Initial static plot (optional)
plot_chart([1, 2, 3, 4, 5], [110, 130, 150, 160, 170], chartCanvas, 260);
