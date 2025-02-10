let table;
const canvas_width = 1200;
const canvas_height = 600;
const margin = {
    top: 120,
    right: 300,
    bottom: 100,
    left: 100
};
const barWidth = 50;
let hoveredBar = -1;
let hoveredPoint = null;
const INACTIVE_ALPHA = 100;

let animationProgress = 0;
let dataPointPulse = 0;
const ANIMATION_DURATION = 60;
let barOpacities = [];
let lineOpacities = { temperature: 255, precipitation: 255 };

const canvasTopMargin = 400;

function preload() {
    table = loadTable("data/dataset.csv", "csv", "header");
}

function setup() {
    let cnv = createCanvas(canvas_width, canvas_height);
    centerCanvas(cnv);

    dates = table.getColumn("Date");
    temperature = table.getColumn("temperature_mean (°C)");
    precipitation = table.getColumn("precipitation (mm)");
    present_rate = table.getColumn("Present_rate_mean");
    absent_rate = table.getColumn("Absent_rate_mean");
    frameRate(30);

    barOpacities = new Array(10).fill(255);
    animationProgress = 0;
}

function centerCanvas(cnv) {
    let x = (windowWidth - canvas_width) / 2;
    let y = (windowHeight - canvas_height) / 2 + canvasTopMargin;
    cnv.position(x, y);
}

function windowResized() {
    centerCanvas();
}

function draw() {
    background(255);
    
    // Update animation states
    if (animationProgress < ANIMATION_DURATION) {
        animationProgress++;
    }
    dataPointPulse = (sin(frameCount * 0.1) + 1) * 2;
    
    let monthlyTemps = calculateMonthlyAverages(temperature, true);
    let monthlyPrecip = calculateMonthlyAverages(precipitation, false);
    let monthlyPresence = calculateMonthlyAverages(present_rate, false);
    let monthlyAbsence = calculateMonthlyAverages(absent_rate, false);
    
    let schoolMonths = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    let tempData = [];
    let precipData = [];
    let presenceData = [];
    let absenceData = [];
    
    for (let month of schoolMonths) {
        tempData.push(monthlyTemps[month]);
        precipData.push(monthlyPrecip[month]);
        presenceData.push(monthlyPresence[month]);
        absenceData.push(monthlyAbsence[month]);
    }
    
    let xStep = (width - margin.left - margin.right) / (schoolMonths.length);
    let chartHeight = height - margin.top - margin.bottom;
    
    stroke(0);
    strokeWeight(1);
    line(margin.left, height - margin.bottom, width - margin.right, height - margin.bottom);
    line(margin.left, margin.top, margin.left, height - margin.bottom);
    line(width - margin.right, margin.top, width - margin.right, height - margin.bottom);
    
    // Draw title and axis labels
    textSize(22);
    // textStyle(BOLD);
    textAlign(CENTER);
    text('The Impact of Temperature and Humidity on \n Student Attendance in New York City (2018-2019)', width/2.4, margin.top/2);
    
    textSize(14);
    text('Months of the School Year', width/2.4, height - margin.bottom/3);
    
    push();
    translate(margin.left/2.3, height/2);
    rotate(-PI/2);
    text('Temperature (°F)', 0, 0);
    pop();
    
    push();
    translate(width - margin.right/1.25, height/2);
    rotate(PI/2);
    text('Precipitation (mm)', 0, 0);
    pop();
    
    // Draw axis values
    textSize(12);
    textAlign(CENTER);
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        text(schoolMonths[i], x, height - margin.bottom + 25);
    }
    
    textAlign(RIGHT);
    let yStep = chartHeight / 10;
    for (let i = 0; i <= 10; i++) {
        let y = height - margin.bottom - i * yStep;
        let temp = i * 10;
        text(temp, margin.left - 15, y + 5);
    }
    
    textAlign(LEFT);
    for (let i = 0; i <= 11; i++) {
        let y = height - margin.bottom - (i * chartHeight / 11);
        let precip = Math.floor(i * 20);
        text(precip, width - margin.right + 15, y + 5);
    }

    drawBarsWithAnimation(schoolMonths, presenceData, absenceData, xStep, chartHeight);
    drawTemperatureLineWithAnimation(tempData, xStep);
    drawPrecipitationLineWithAnimation(precipData, xStep);
    
    // Update hover detection for temperature points
    hoveredPoint = null;
    for (let i = 0; i < tempData.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let tempY = map(tempData[i], 0, 100, height - margin.bottom, margin.top);
        
        // Check temperature point hover
        if (dist(mouseX, mouseY, x, tempY) < 10) {
            hoveredPoint = {
                type: 'temperature',
                month: schoolMonths[i],
                value: tempData[i].toFixed(1),
                x: x,
                y: tempY
            };
        }
        
        // Check precipitation point hover
        let precipY = map(precipData[i], 0, 220, height - margin.bottom, margin.top);
        if (dist(mouseX, mouseY, x, precipY) < 10) {
            hoveredPoint = {
                type: 'precipitation',
                month: schoolMonths[i],
                value: precipData[i].toFixed(1),
                x: x,
                y: precipY
            };
        }
    }

    // Draw hover information
    if (hoveredBar !== -1) {
        drawBarInfo(hoveredBar, schoolMonths, presenceData, absenceData, mouseX, mouseY);
    }
    
    if (hoveredPoint) {
        drawPointInfo(hoveredPoint);
    }

    // Draw legend and other static elements
    drawLegend();
}

function drawBarsWithAnimation(schoolMonths, presenceData, absenceData, xStep, chartHeight) {
    hoveredBar = -1; // Reset hover state
    
    // First pass: find if any bar is being hovered
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + (xStep - barWidth) / 2;
        let baselineY = height - margin.bottom;
        let total = presenceData[i] + absenceData[i];
        let normalizedPresence = (presenceData[i] / total) * 100;
        let normalizedAbsence = (absenceData[i] / total) * 100;
        
        if (mouseX >= x && mouseX <= x + barWidth &&
            mouseY >= baselineY - (normalizedPresence + normalizedAbsence) * chartHeight/100 &&
            mouseY <= baselineY) {
            hoveredBar = i;
            break;
        }
    }
    
    // Second pass: draw bars with animation
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + (xStep - barWidth) / 2;
        let baselineY = height - margin.bottom;
        let total = presenceData[i] + absenceData[i];
        let normalizedPresence = (presenceData[i] / total) * 100;
        let normalizedAbsence = (absenceData[i] / total) * 100;
        
        // Calculate animation progress for this bar
        let barProgress = min(1, (animationProgress - (i * 3)) / 20);
        
        // Animate opacity transitions
        let targetOpacity = (hoveredBar === -1 || hoveredBar === i) ? 255 : INACTIVE_ALPHA;
        barOpacities[i] = lerp(barOpacities[i], targetOpacity, 0.2);
        
        noStroke();
        // Present bars with animation
        fill(144, 238, 144, barOpacities[i]);
        let presenceHeight = map(normalizedPresence * barProgress, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight, barWidth, presenceHeight);
        
        // Absent bars with animation
        fill(255, 182, 193, barOpacities[i]);
        let absenceHeight = map(normalizedAbsence * barProgress, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight - absenceHeight, barWidth, absenceHeight);
    }
}

function drawTemperatureLineWithAnimation(tempData, xStep) {
    let isHovering = hoveredPoint && hoveredPoint.type === 'temperature';
    let targetOpacity = isHovering ? INACTIVE_ALPHA : 255;
    lineOpacities.temperature = lerp(lineOpacities.temperature, targetOpacity, 0.2);
    
    let progress = min(1, animationProgress / ANIMATION_DURATION);
    
    stroke(255, 0, 0, lineOpacities.temperature);
    strokeWeight(2);
    
    // Draw lines with progressive animation
    for (let i = 0; i < tempData.length - 1; i++) {
        let segmentProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (segmentProgress > 0) {
            let x1 = margin.left + i * xStep + xStep/2;
            let y1 = map(tempData[i], 0, 100, height - margin.bottom, margin.top);
            let x2 = margin.left + (i + 1) * xStep + xStep/2;
            let y2 = map(tempData[i + 1], 0, 100, height - margin.bottom, margin.top);
            
            // Draw line segment with progress
            let lineX2 = lerp(x1, x2, segmentProgress);
            let lineY2 = lerp(y1, y2, segmentProgress);
            line(x1, y1, lineX2, lineY2);
        }
    }
    
    // Draw points with progressive appearance
    for (let i = 0; i < tempData.length; i++) {
        let pointProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (pointProgress > 0) {
            let x = margin.left + i * xStep + xStep/2;
            let y = map(tempData[i], 0, 100, height - margin.bottom, margin.top);
            fill(255, 0, 0, lineOpacities.temperature * pointProgress);
            let pointSize = hoveredPoint && hoveredPoint.type === 'temperature' ? 8 + dataPointPulse : 8;
            ellipse(x, y, pointSize, pointSize);
        }
    }
}

function drawPrecipitationLineWithAnimation(precipData, xStep) {
    let isHovering = hoveredPoint && hoveredPoint.type === 'precipitation';
    let targetOpacity = isHovering ? INACTIVE_ALPHA : 255;
    lineOpacities.precipitation = lerp(lineOpacities.precipitation, targetOpacity, 0.2);
    
    let progress = min(1, animationProgress / ANIMATION_DURATION);
    
    stroke(0, 0, 255, lineOpacities.precipitation);
    strokeWeight(2);
    
    // Draw lines with progressive animation
    for (let i = 0; i < precipData.length - 1; i++) {
        let segmentProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (segmentProgress > 0) {
            let x1 = margin.left + i * xStep + xStep/2;
            let y1 = map(precipData[i], 0, 220, height - margin.bottom, margin.top);
            let x2 = margin.left + (i + 1) * xStep + xStep/2;
            let y2 = map(precipData[i + 1], 0, 220, height - margin.bottom, margin.top);
            
            // Draw line segment with progress
            let lineX2 = lerp(x1, x2, segmentProgress);
            let lineY2 = lerp(y1, y2, segmentProgress);
            line(x1, y1, lineX2, lineY2);
        }
    }
    
    // Draw points with progressive appearance
    for (let i = 0; i < precipData.length; i++) {
        let pointProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (pointProgress > 0) {
            let x = margin.left + i * xStep + xStep/2;
            let y = map(precipData[i], 0, 220, height - margin.bottom, margin.top);
            fill(0, 0, 255, lineOpacities.precipitation * pointProgress);
            let pointSize = hoveredPoint && hoveredPoint.type === 'precipitation' ? 8 + dataPointPulse : 8;
            ellipse(x, y, pointSize, pointSize);
        }
    }
}

function drawLegend() {
    let legendX = width - margin.right + 140;
    let legendY = margin.top + 30;
    textAlign(LEFT);
    textSize(12);
    
    fill(0);
    noStroke();
    textStyle(BOLD);
    text('Legend', legendX, legendY - 30);
    
    let textWidthValue = textWidth('Legend');
    stroke(0);
    strokeWeight(2);
    line(legendX, legendY - 25, legendX + textWidthValue, legendY - 25);
    noStroke();
    
    stroke(255, 0, 0);
    line(legendX, legendY, legendX + 20, legendY);
    fill(255, 0, 0);
    ellipse(legendX + 10, legendY, 8, 8);
    fill(0);
    noStroke();
    text('Temperature', legendX + 30, legendY + 5);
    
    legendY += 30;
    stroke(0, 0, 255);
    line(legendX, legendY, legendX + 20, legendY);
    fill(0, 0, 255);
    ellipse(legendX + 10, legendY, 8, 8);
    fill(0);
    noStroke();
    text('Precipitation', legendX + 30, legendY + 5);
    
    legendY += 30;
    noStroke();
    fill(144, 238, 144);
    rect(legendX, legendY - 8, 20, 16);
    fill(0);
    text('Present', legendX + 30, legendY + 5);
    
    legendY += 30;
    fill(255, 182, 193);
    rect(legendX, legendY - 8, 20, 16);
    fill(0);
    text('Absent', legendX + 30, legendY + 5);
}

function drawBarInfo(index, months, presenceData, absenceData, x, y) {
    let total = presenceData[index] + absenceData[index];
    let presentPercent = (presenceData[index] / total * 100).toFixed(1);
    let absentPercent = (absenceData[index] / total * 100).toFixed(1);
    
    fill(255);
    stroke(0);
    rect(x + 10, y - 70, 160, 60);
    
    noStroke();
    fill(0);
    textAlign(LEFT);
    textSize(12);
    text(`Month: ${months[index]}`, x + 20, y - 50);
    text(`Present: ${presentPercent}%`, x + 20, y - 35);
    text(`Absent: ${absentPercent}%`, x + 20, y - 20);
}

function drawPointInfo(point) {
    fill(255);
    stroke(0);
    rect(point.x + 10, point.y - 40, 160, 40);
    
    noStroke();
    fill(0);
    textAlign(LEFT);
    textSize(12);
    text(`Month: ${point.month}`, point.x + 20, point.y - 25);
    text(`${point.type}: ${point.value}${point.type === 'temperature' ? '°F' : 'mm'}`, 
         point.x + 20, point.y - 10);
}

function calculateMonthlyAverages(data, isTemperature) {
  let monthlyData = {
      'Sept': [], 'Oct': [], 'Nov': [], 'Dec': [],
      'Jan': [], 'Feb': [], 'Mar': [], 'Apr': [], 'May': [], 'Jun': [],
  };
  
  for (let i = 0; i < dates.length; i++) {
      let date = new Date(dates[i]);
      let month = date.getMonth();
      let value = parseFloat(data[i]);
      
      if (isTemperature) {
          value = (value * 9/5) + 32;
      }
      
      let monthName = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
      ][month];
      
      if (monthName in monthlyData) {
          monthlyData[monthName].push(value);
      }
  }
  
  let results = {};
  for (let month in monthlyData) {
      if (monthlyData[month].length > 0) {
          if (isTemperature) {
              results[month] = monthlyData[month].reduce((a, b) => a + b) / monthlyData[month].length;
          } else {
              results[month] = monthlyData[month].reduce((a, b) => a + b, 0);
          }
      } else {
          results[month] = 0;
      }
  }
  
  return results;
}