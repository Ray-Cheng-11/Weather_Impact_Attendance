
var canvas_width = 1920;
var canvas_height = 1080;

let table;

function preload() {
  table = loadTable("/data/dataset.csv", "csv", "header");
}


function setup() {
 // put setup code here
  console.log(table.getRowCount() + " total rows in table");
  console.log(table.getColumnCount() + " total columns in table");
  
  createCanvas(canvas_width, canvas_height);

  dates = table.getColumn("Date");//ALREADY ORDERED
  number_of_absents = table.getColumn("Absent_mean_NY");
  absent_rate = table.getColumn("Absent_rate_mean");
  number_of_presents = table.getColumn("Present_mean_NY");
  present_rate = table.getColumn("Present_rate_mean");
  temperature = table.getColumn("temperature_mean (°C)");
  precipitation = table.getColumn("precipitation (mm)");
  description = table.getColumn("description");

}

//ALL DATA ARE EASILY ACCESSIBLE YOU CAN DRAW WHATEVER YOU WANT
function draw() {
  // put drawing code here
  background(230);
  
}
