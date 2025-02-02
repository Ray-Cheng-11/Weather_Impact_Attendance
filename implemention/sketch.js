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
}

function centerCanvas(cnv) {
    let x = (windowWidth - canvas_width) / 2;
    let y = (windowHeight - canvas_height) / 2;
    cnv.position(x, y);
}

function windowResized() {
    centerCanvas();
}

function draw() {
    background(255);
    
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
    
    for (let i = 0; i < schoolMonths.length; i++) {
        let x = margin.left + i * xStep + (xStep - barWidth) / 2;
        let baselineY = height - margin.bottom;

        let total = presenceData[i] + absenceData[i];
        let normalizedPresence = (presenceData[i] / total) * 100;
        let normalizedAbsence = (absenceData[i] / total) * 100;
        
        fill(144, 238, 144);
        noStroke();
        let presenceHeight = map(normalizedPresence, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight, barWidth, presenceHeight);
        
        fill(255, 182, 193);
        let absenceHeight = map(normalizedAbsence, 0, 100, 0, chartHeight);
        rect(x, baselineY - presenceHeight - absenceHeight, barWidth, absenceHeight);
    }
    
    fill(0);
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
    
    textSize(14);
    textAlign(CENTER);
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
    
    textSize(19);
    textStyle(BOLD);
    text('The Impact of Temperature and Humidity on \n Student Attendance in New York City (2018-2019)', width/2.4, margin.top/2);
    
    stroke(255, 0, 0);
    strokeWeight(2);
    for (let i = 0; i < tempData.length - 1; i++) {
        let x1 = margin.left + i * xStep + xStep/2;
        let y1 = map(tempData[i], 0, 100, height - margin.bottom, margin.top);
        let x2 = margin.left + (i + 1) * xStep + xStep/2;
        let y2 = map(tempData[i + 1], 0, 100, height - margin.bottom, margin.top);
        line(x1, y1, x2, y2);
    }
    fill(255, 0, 0);
    for (let i = 0; i < tempData.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let y = map(tempData[i], 0, 100, height - margin.bottom, margin.top);
        ellipse(x, y, 8, 8);
    }
    
    stroke(0, 0, 255);
    for (let i = 0; i < precipData.length - 1; i++) {
        let x1 = margin.left + i * xStep + xStep/2;
        let y1 = map(precipData[i], 0, 220, height - margin.bottom, margin.top);
        let x2 = margin.left + (i + 1) * xStep + xStep/2;
        let y2 = map(precipData[i + 1], 0, 220, height - margin.bottom, margin.top);
        line(x1, y1, x2, y2);
    }
    fill(0, 0, 255);
    for (let i = 0; i < precipData.length; i++) {
        let x = margin.left + i * xStep + xStep/2;
        let y = map(precipData[i], 0, 220, height - margin.bottom, margin.top);
        ellipse(x, y, 8, 8);
    }
    
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
    
    noLoop();
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