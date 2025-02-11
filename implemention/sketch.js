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
const INACTIVE_ALPHA = 100; // transparency for non-hovered elements
const canvasTopMargin = 400;


let animationProgress = 0;
let dataPointPulse = 0;
const ANIMATION_DURATION = 60; // frames
let barOpacities = [];
let lineOpacities = { temperature: 255, precipitation: 255 };

let showDailyData = false;
let selectedMonth = null;
let switchButton;
let monthButtons = [];
let hoveredDayIndex = -1;
let hoveredPointDaily = null;

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

    // Style the switch button
    switchButton = createButton('Switch to Daily View');
    switchButton.position(width - margin.right + 140, height - 40);
    switchButton.mousePressed(toggleView);
    styleButton(switchButton, true);
    
    let buttonX = width - margin.right + 140;
    let buttonY = height - 100;
    let schoolMonths = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    schoolMonths.forEach((month, i) => {
        let btn = createButton(month);
        btn.position(buttonX + (i % 5) * 65, buttonY + Math.floor(i / 5) * 35);
        btn.mousePressed(() => selectMonth(month));
        btn.hide();
        styleButton(btn, false);
        monthButtons.push(btn);
    });
}

function centerCanvas(cnv) {
    let x = (windowWidth - canvas_width) / 2;
    let y = (windowHeight - canvas_height) / 2+ canvasTopMargin;
    cnv.position(x, y);
}

function windowResized() {
    centerCanvas();
}

function draw() {
    background(255);
    
    if (animationProgress < ANIMATION_DURATION) {
        animationProgress++;
    }
    dataPointPulse = (sin(frameCount * 0.1) + 1) * 2;
    
    let xStep, chartHeight;
    if (showDailyData && selectedMonth) {
        let dailyData = getDailyData(selectedMonth);
        xStep = (width - margin.left - margin.right) / (dailyData.dates.length);
        chartHeight = height - margin.top - margin.bottom;
    } else {
        let schoolMonths = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        xStep = (width - margin.left - margin.right) / schoolMonths.length;
        chartHeight = height - margin.top - margin.bottom;
    }

    // Draw basic chart structure
    drawChartStructure(xStep, chartHeight);
    

    if (showDailyData && selectedMonth) {
        let dailyData = getDailyData(selectedMonth);
        drawDailyView(dailyData, xStep, chartHeight);
    } else {
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
        
        drawBarsWithAnimation(schoolMonths, presenceData, absenceData, xStep, chartHeight);
        drawTemperatureLineWithAnimation(tempData, xStep);
        drawPrecipitationLineWithAnimation(precipData, xStep);

    }

    // Draw legend
    drawLegend();
}

function drawChartStructure(xStep, chartHeight) {
    // Draw axes with consistent stroke weight
    stroke(0);
    strokeWeight(0.5);
    line(margin.left, height - margin.bottom, width - margin.right, height - margin.bottom);
    line(margin.left, margin.top, margin.left, height - margin.bottom);
    line(width - margin.right, margin.top, width - margin.right, height - margin.bottom);
    
    // Draw title and axis labels
    textSize(22);
    textAlign(CENTER);
    let monthLongName = selectedMonth;
    if (selectedMonth) {
        monthLongName = getMonthLongName(selectedMonth);
    }

    let titleText = showDailyData && selectedMonth ? 
        `Daily Weather and Attendance Data for ${monthLongName} (2018-2019)` :
        'The Impact of Temperature and Humidity on \n Student Attendance in New York City (2018-2019)';
    text(titleText, width/2.4, margin.top/2);
    
    textSize(14);
    text(showDailyData && selectedMonth ? 'Days of the Month' : 'Months of the School Year', 
         width/2.4, height - margin.bottom/3);
    
    // Y-axis labels
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
}

function drawBarsWithAnimation(schoolMonths, presenceData, absenceData, xStep, chartHeight) {
    hoveredBar = -1; // Reset hover state
    
    // First pass: find if any bar is being hovered
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + (xStep - barWidth) / 2;
        let baselineY = height - margin.bottom;
        let normalizedAttendance = getNormalizedAttendance(presenceData[i], absenceData[i]);
        let barHeight = map(normalizedAttendance.presencePercent + normalizedAttendance.absencePercent, 0, 100, 0, chartHeight);
        
        if (mouseX >= x && mouseX <= x + barWidth &&
            mouseY >= baselineY - barHeight &&
            mouseY <= baselineY) {
            hoveredBar = i;
            break;
        }
    }
    
    // Second pass: draw bars with animation
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + (xStep - barWidth) / 2;
        let baselineY = height - margin.bottom;
        let normalizedAttendance = getNormalizedAttendance(presenceData[i], absenceData[i]);
        
        // Calculate animation progress for this bar
        let barProgress = min(1, (animationProgress - (i * 3)) / 20);
        
        let targetOpacity = (hoveredBar === -1 || hoveredBar === i) ? 255 : INACTIVE_ALPHA;
        barOpacities[i] = lerp(barOpacities[i], targetOpacity, 0.2);
        
        noStroke();
        fill(144, 238, 144, barOpacities[i]);
        let presenceHeight = map(normalizedAttendance.presencePercent * barProgress, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight, barWidth, presenceHeight);
        
        // Absent bars with animation
        fill(255, 182, 193, barOpacities[i]);
        let absenceHeight = map(normalizedAttendance.absencePercent * barProgress, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight - absenceHeight, barWidth, absenceHeight);
    }

    strokeWeight(0.3);
    stroke(0);
    fill(0);
    
    textSize(12);
    textAlign(CENTER);
    
    // X-axis (months)
    textSize(12);
    textAlign(CENTER);
    fill(0);
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        text(schoolMonths[i], x, height - margin.bottom + 25);
    }
    
    // Temperature axis (left)
    textAlign(RIGHT);
    fill(0);
    for (let i = 0; i <= 10; i++) {
        let y = height - margin.bottom - (i * chartHeight / 10);
        let temp = i * 10;
        text(temp, margin.left - 10, y + 5);
    }
    
    // Precipitation axis (right)
    textAlign(LEFT);
    fill(0);
    for (let i = 0; i <= 6; i++) {
        let y = height - margin.bottom - (i * chartHeight / 6);
        let precip = i * 5;
        text(precip, width - margin.right + 10, y + 5);
    }
    
    if (hoveredBar !== -1) {
        drawMonthlyBarInfo(hoveredBar, schoolMonths, presenceData, absenceData, mouseX, mouseY);
    }
}
function drawTemperatureLineWithAnimation(tempData, xStep) {
    let isHovering = hoveredPoint && hoveredPoint.type === 'temperature';
    let targetOpacity = isHovering ? INACTIVE_ALPHA : 255;
    lineOpacities.temperature = lerp(lineOpacities.temperature, targetOpacity, 0.2);
    
    let progress = min(1, animationProgress / ANIMATION_DURATION);
    
    stroke(255, 0, 0, lineOpacities.temperature);
    strokeWeight(2);
    
    // Draw line segments with progressive animation
    for (let i = 0; i < tempData.length - 1; i++) {
        let segmentProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (segmentProgress > 0) {
            let x1 = margin.left + i * xStep + xStep/2;
            let y1 = map(tempData[i], 0, 100, height - margin.bottom, margin.top);
            let x2 = margin.left + (i + 1) * xStep + xStep/2;
            let y2 = map(tempData[i + 1], 0, 100, height - margin.bottom, margin.top);
            let lineX2 = lerp(x1, x2, segmentProgress);
            let lineY2 = lerp(y1, y2, segmentProgress);
            line(x1, y1, lineX2, lineY2);
        }
    }
    
    // Clear previous hover state for temperature points
    if (!mouseIsPressed) {
        hoveredPoint = null;
    }
    
    // Prepare month labels for tooltip (fixed order)
    const months = ['Sept','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
    
    // Draw temperature points with hover detection
    for (let i = 0; i < tempData.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let y = map(tempData[i], 0, 100, height - margin.bottom, margin.top);
        let pointProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        fill(255, 0, 0, lineOpacities.temperature * pointProgress);
        let pointSize = hoveredPoint && hoveredPoint.type === 'temperature' && hoveredPoint.x === x ? 8 + dataPointPulse : 8;
        ellipse(x, y, pointSize, pointSize);
        
        // Check if mouse is near this point (distance threshold 5)
        if (dist(mouseX, mouseY, x, y) < 5) {
            hoveredPoint = { type: 'temperature', x, y, month: months[i], value: tempData[i] };
        }
    }
    if (hoveredPoint && hoveredPoint.type === 'temperature') {
        drawPointInfo(hoveredPoint);
    }
}

function drawPrecipitationLineWithAnimation(precipData, xStep) {
    let isHovering = hoveredPoint && hoveredPoint.type === 'precipitation';
    let targetOpacity = isHovering ? INACTIVE_ALPHA : 255;
    lineOpacities.precipitation = lerp(lineOpacities.precipitation, targetOpacity, 0.2);
    
    let progress = min(1, animationProgress / ANIMATION_DURATION);
    
    stroke(0, 0, 255, lineOpacities.precipitation);
    strokeWeight(2);
    
    // Draw line segments with progressive animation
    for (let i = 0; i < precipData.length - 1; i++) {
        let segmentProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        if (segmentProgress > 0) {
            let x1 = margin.left + i * xStep + xStep/2;
            let y1 = map(precipData[i], 0, 30, height - margin.bottom, margin.top);
            let x2 = margin.left + (i + 1) * xStep + xStep/2;
            let y2 = map(precipData[i + 1], 0, 30, height - margin.bottom, margin.top);
            let lineX2 = lerp(x1, x2, segmentProgress);
            let lineY2 = lerp(y1, y2, segmentProgress);
            line(x1, y1, lineX2, lineY2);
        }
    }
    
    // Clear previous hover state for precipitation points
    if (!mouseIsPressed) {
        hoveredPoint = null;
    }
    
    // Prepare month labels for tooltip (fixed order)
    const months = ['Sept','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
    
    // Draw precipitation points with hover detection
    for (let i = 0; i < precipData.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let y = map(precipData[i], 0, 30, height - margin.bottom, margin.top);
        let pointProgress = min(1, (progress * ANIMATION_DURATION - (i * 5)) / 5);
        fill(0, 0, 255, lineOpacities.precipitation * pointProgress);
        let pointSize = hoveredPoint && hoveredPoint.type === 'precipitation' && hoveredPoint.x === x ? 8 + dataPointPulse : 8;
        ellipse(x, y, pointSize, pointSize);
        
        // Check if mouse is near this point
        if (dist(mouseX, mouseY, x, y) < 5) {
            hoveredPoint = { type: 'precipitation', x, y, month: months[i], value: precipData[i] };
        }
    }
    if (hoveredPoint && hoveredPoint.type === 'precipitation') {
        drawPointInfo(hoveredPoint);
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
    strokeWeight(0.3);
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

function drawPointInfo(point) {
    // Calculate text width for dynamic sizing
    textSize(12);
    let label = point.type === 'temperature' ? 
        `Temperature: ${point.value.toFixed(1)}°F` :
        `Precipitation: ${point.value.toFixed(1)}mm`;
    let textW = textWidth(label);
    
    // Add padding and calculate dimensions
    let padding = 10;
    let boxWidth = textW + (padding * 2);
    let boxHeight = 35;
    
    // Position tooltip to avoid going off screen
    let tooltipX = point.x + 10;
    let tooltipY = point.y - 65;
    
    if (tooltipX + boxWidth > width) {
        tooltipX = width - boxWidth - 10;
    }
    
    // Draw tooltip background with rounded corners and shadow
    push();
    drawingContext.shadowOffsetX = 3;
    drawingContext.shadowOffsetY = 3;
    drawingContext.shadowBlur = 5;
    drawingContext.shadowColor = 'rgba(0,0,0,0.2)';
    
    fill(245);
    stroke(180);
    strokeWeight(1);
    rect(tooltipX, tooltipY, boxWidth, boxHeight, 5);
    pop();
    
    // Draw text
    noStroke();
    fill(50);
    textAlign(LEFT, CENTER);
    text(label, tooltipX + padding, tooltipY + boxHeight/2);
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
          // Calculate average for both temperature and precipitation
          results[month] = monthlyData[month].reduce((a, b) => a + b) / monthlyData[month].length;

      } else {
          results[month] = 0;
      }
  }
  
  return results;
}

function toggleView() {
    showDailyData = !showDailyData;
    switchButton.html(showDailyData ? 'Switch to Monthly View' : 'Switch to Daily View');
    
    if (showDailyData) {
        // Animate button appearance
        monthButtons.forEach((btn, i) => {
            setTimeout(() => {
                btn.show();
                btn.style('opacity', '0');
                fadeInButton(btn);
            }, i * 50);
        });
    } else {
        // Animate button disappearance
        monthButtons.forEach((btn, i) => {
            setTimeout(() => {
                fadeOutButton(btn);
            }, i * 50);
        });
    }
    selectedMonth = null;
}

function selectMonth(month) {
    selectedMonth = selectedMonth === month ? null : month;
    monthButtons.forEach(btn => {
        btn.removeClass('selected');
        if (btn.html() === month && selectedMonth === month) {
            btn.addClass('selected');
            btn.style('background-color', '#4a90e2');
            btn.style('color', '#ffffff');
        } else {
            btn.style('background-color', '#ffffff');
            btn.style('color', '#4a90e2');
        }
    });
}

function getDailyData(month) {
    let dailyData = {
        temperature: [],
        precipitation: [],
        presence: [],
        absence: [],
        dates: [],
        descriptions: [],
        fullDates: []
    };
    
    for (let i = 0; i < dates.length; i++) {
        let date = new Date(dates[i]);
        let monthName = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
        ][date.getMonth()];
        
        if (monthName === month) {
            dailyData.temperature.push((parseFloat(temperature[i]) * 9/5) + 32);
            dailyData.precipitation.push(parseFloat(precipitation[i]));
            dailyData.presence.push(parseFloat(present_rate[i]));
            dailyData.absence.push(parseFloat(absent_rate[i]));
            dailyData.dates.push(date.getDate());
            dailyData.descriptions.push(table.getString(i, 'description'));
            dailyData.fullDates.push(dates[i]);
        }
    }
    
    // Calculate appropriate bar width based on number of dates
    const calculatedBarWidth = Math.min(
        50, // maximum width
        ((width - margin.left - margin.right) / dailyData.dates.length) * 0.8 // 80% of available space
    );
    dailyData.barWidth = calculatedBarWidth;
    
    return dailyData;
}

function drawDailyView(dailyData, xStep, chartHeight) {
    strokeWeight(0.3);
    stroke(0);
    fill(0);
    
    // Draw axis values for daily view with consistent formatting
    textSize(12);
    textAlign(CENTER);
    fill(0);
    
    // X-axis (dates)
    for (let i = 0; i < dailyData.dates.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        text(dailyData.dates[i], x, height - margin.bottom + 25);
    }
    
    // Y-axis temperature values (left)
    textAlign(RIGHT);
    fill(0);
    for (let i = 0; i <= 10; i++) {
        let y = height - margin.bottom - (i * chartHeight / 10);
        let temp = i * 10;
        text(temp, margin.left - 10, y + 5);
    }
    
    // Y-axis precipitation values (right)
    textAlign(LEFT);
    fill(0);
    for (let i = 0; i <= 6; i++) {
        let y = height - margin.bottom - (i * chartHeight / 6);
        let precip = i * 10;
        text(precip, width - margin.right + 10, y + 5);
    }

    hoveredDayIndex = -1;
    hoveredPointDaily = null;

    // Use the calculated bar width instead of global barWidth
    let dailyBarWidth = dailyData.barWidth;

    for (let i = 0; i < dailyData.dates.length; i++) {
        let x = margin.left + i * xStep + (xStep - dailyBarWidth) / 2;
        let baselineY = height - margin.bottom;
        
        let normalizedAttendance = getNormalizedAttendance(dailyData.presence[i], dailyData.absence[i]);
        let barHeight = map(normalizedAttendance.presencePercent + normalizedAttendance.absencePercent, 0, 100, 0, chartHeight);
        
        if (mouseX >= x && mouseX <= x + dailyBarWidth &&
            mouseY >= baselineY - barHeight && mouseY <= baselineY) {
            hoveredDayIndex = i;
        }
    }

    for (let i = 0; i < dailyData.dates.length; i++) {
        let x = margin.left + i * xStep + (xStep - dailyBarWidth) / 2;
        let baselineY = height - margin.bottom;
        
        let normalizedAttendance = getNormalizedAttendance(dailyData.presence[i], dailyData.absence[i]);
        
        noStroke();
        // Present bars
        fill(144, 238, 144, hoveredDayIndex === -1 || hoveredDayIndex === i ? 255 : INACTIVE_ALPHA);
        let presenceHeight = map(normalizedAttendance.presencePercent, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight, dailyBarWidth, presenceHeight);
        
        // Absent bars
        fill(255, 182, 193, hoveredDayIndex === -1 || hoveredDayIndex === i ? 255 : INACTIVE_ALPHA);
        let absenceHeight = map(normalizedAttendance.absencePercent, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight - absenceHeight, dailyBarWidth, absenceHeight);
    }

    // Draw temperature line
    stroke(255, 0, 0);
    strokeWeight(2);
    beginShape();
    noFill();
    for (let i = 0; i < dailyData.temperature.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let y = map(dailyData.temperature[i], 0, 100, height - margin.bottom, margin.top);
        vertex(x, y);
    }
    endShape();
    
    // Draw temperature points
    for (let i = 0; i < dailyData.temperature.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let y = map(dailyData.temperature[i], 0, 100, height - margin.bottom, margin.top);
        noStroke();
        fill(255, 0, 0);
        let pointSize = hoveredPointDaily && 
                       hoveredPointDaily.type === 'temperature' && 
                       hoveredPointDaily.x === x ? 10 : 6;
        ellipse(x, y, pointSize, pointSize);
    }

    // Draw precipitation line
    stroke(0, 0, 255);
    strokeWeight(2);
    beginShape();
    noFill();
    for (let i = 0; i < dailyData.precipitation.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let y = map(dailyData.precipitation[i], 0, 60, height - margin.bottom, margin.top);
        vertex(x, y);
    }
    endShape();
    
    // Draw precipitation points
    for (let i = 0; i < dailyData.precipitation.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let y = map(dailyData.precipitation[i], 0, 60, height - margin.bottom, margin.top);
        noStroke();
        fill(0, 0, 255);
        let pointSize = hoveredPointDaily && 
                       hoveredPointDaily.type === 'precipitation' && 
                       hoveredPointDaily.x === x ? 10 : 6;
        ellipse(x, y, pointSize, pointSize);
    }

    if (hoveredDayIndex !== -1) {
        drawDayInfo(dailyData, hoveredDayIndex, mouseX, mouseY);
    }
}

function drawDayInfo(dailyData, index, x, y) {
    let date = dailyData.fullDates[index];
    let total = dailyData.presence[index] + dailyData.absence[index];
    let presentPercent = (dailyData.presence[index] / total * 100).toFixed(1);
    let absentPercent = (dailyData.absence[index] / total * 100).toFixed(1);
    let temperature = dailyData.temperature[index].toFixed(1);
    let precipitation = dailyData.precipitation[index];
    let description = dailyData.descriptions[index];

    let padding = 10;
    let lineHeight = 16;
    let textStart = padding + 2;
    textSize(12);

    // Calculate text widths to determine tooltip width
    let dateWidth = textWidth(date) + 70;
    let presentWidth = textWidth(`${presentPercent}%`) + 70;
    let absentWidth = textWidth(`${absentPercent}%`) + 70;
    let tempWidth = textWidth(`${temperature}°F`) + textWidth("Temperature:") + 10;
    let precipWidth = textWidth(`${precipitation}mm`) + textWidth("Precipitation:") + 10;
    let descWidth = textWidth(description);

    // Calculate optimal tooltip width
    let tooltipWidth = max(
        dateWidth,
        presentWidth,
        absentWidth,
        tempWidth,
        precipWidth,
        descWidth,
        240 // minimum width
    ) + padding * 2;

    // Calculate description height with text wrapping
    textSize(12);
    let descriptionLines = 1;
    let words = description.split(' ');
    let currentLine = '';
    let maxWidth = tooltipWidth - padding * 2;
    
    for (let word of words) {
        let testLine = currentLine + word + ' ';
        if (textWidth(testLine) > maxWidth) {
            descriptionLines++;
            currentLine = word + ' ';
        } else {
            currentLine = testLine;
        }
    }

    let tooltipHeight = padding * 2 + lineHeight * (5 + descriptionLines)+10;

    let tooltipX = x + 10;
    let tooltipY = y - tooltipHeight;

    if (tooltipX + tooltipWidth > width) {
        tooltipX = width - tooltipWidth - 10;
    }
    if (tooltipY < 0) {
        tooltipY = 10;
    }

    // Draw tooltip background
    fill(245);
    stroke(100);
    strokeWeight(1);
    rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 5);

    // Reset text properties
    noStroke();
    textAlign(LEFT, TOP);

    let currentY = tooltipY + padding;

    // Date
    fill(80);
    textSize(11);
    text("Date:", tooltipX + textStart, currentY);
    fill(50);
    textSize(12);
    text(date, tooltipX + 70, currentY);
    currentY += lineHeight;

    // Attendance
    fill(80);
    textSize(11);
    text("Present:", tooltipX + textStart, currentY);
    fill(50);
    textSize(12);
    text(`${presentPercent}%`, tooltipX + 70, currentY);
    currentY += lineHeight;

    fill(80);
    textSize(11);
    text("Absent:", tooltipX + textStart, currentY);
    fill(50);
    textSize(12);
    text(`${absentPercent}%`, tooltipX + 70, currentY);
    currentY += lineHeight;

    // Weather
    fill(80);
    textSize(11);
    text("Temperature:", tooltipX + textStart, currentY);
    fill(50);
    textSize(12);
    text(`${temperature}°F`, tooltipX + textStart + 80, currentY);
    currentY += lineHeight;

    fill(80);
    textSize(11);
    text("Precipitation:", tooltipX + textStart, currentY);
    fill(50);
    textSize(12);
    text(`${precipitation}mm`, tooltipX + textStart + 80, currentY);
    currentY += lineHeight;

    // Description with wrapping
    fill(80);
    textSize(11);
    text("Weather:", tooltipX + textStart, currentY);
    fill(50);
    textSize(12);
    text(description, tooltipX + textStart, currentY + lineHeight, maxWidth);
}

function getMonthlyWeatherDescription(month) {
    let descriptions = [];
    for (let i = 0; i < dates.length; i++) {
        let date = new Date(dates[i]);
        let monthName = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
        ][date.getMonth()];
        
        if (monthName === month) {
            descriptions.push(table.getString(i, 'description'));
        }
    }
}

function drawMonthlyBarInfo(index, months, presenceData, absenceData, x, y) {
    let { presencePercent, absencePercent } = getNormalizedAttendance(presenceData[index], absenceData[index]);
    
    let monthLongName = getMonthLongName(months[index]);
    
    fill(255);
    stroke(0);
    rect(x + 10, y - 100, 150, 60);
    
    noStroke();
    fill(0);
    textAlign(LEFT);
    textSize(12);
    text(`Month: ${monthLongName}`, x + 20, y - 85);
    text(`Present: ${presencePercent.toFixed(1)}%`, x + 20, y - 70);
    text(`Absent: ${absencePercent.toFixed(1)}%`, x + 20, y - 55);

}

function styleButton(btn, isToggle) {
    btn.style('background-color', '#ffffff');
    btn.style('border', '2px solid #4a90e2');
    btn.style('border-radius', '5px');
    btn.style('color', '#4a90e2');
    btn.style('padding', isToggle ? '10px 20px' : '8px 12px');
    btn.style('font-family', 'Arial, sans-serif');
    btn.style('font-size', isToggle ? '14px' : '12px');
    btn.style('cursor', 'pointer');
    btn.style('transition', 'all 0.3s ease');
    btn.style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');
    
    // Add hover effect
    btn.mouseOver(() => {
        btn.style('background-color', '#4a90e2');
        btn.style('color', '#ffffff');
    });
    
    btn.mouseOut(() => {
        if (!btn.hasClass('selected')) {
            btn.style('background-color', '#ffffff');
            btn.style('color', '#4a90e2');
        }
    });
}

function fadeInButton(btn) {
    let opacity = 0;
    let fadeInterval = setInterval(() => {
        opacity += 0.1;
        btn.style('opacity', opacity);
        if (opacity >= 1) {
            clearInterval(fadeInterval);
        }
    }, 20);
}

function fadeOutButton(btn) {
    let opacity = 1;
    let fadeInterval = setInterval(() => {
        opacity -= 0.1;
        btn.style('opacity', opacity);
        if (opacity <= 0) {
            clearInterval(fadeInterval);
            btn.hide();
        }
    }, 20);
}

function getNormalizedAttendance(presence, absence) {
    let total = presence + absence;
    if (total === 0) return { presencePercent: 0, absencePercent: 0 };
    return {
        presencePercent: (presence / total) * 100,
        absencePercent: (absence / total) * 100
    };
}

function getMonthLongName(shortName) {
    const monthNames = {
        'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
        'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
        'Sept': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
    };
    return monthNames[shortName] || shortName;
}