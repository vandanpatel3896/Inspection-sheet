// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    let isDrawing = false;
    let x = 0;
    let y = 0;
    
    const customerSignCanvas = document.getElementById("customersign");
    const officerSignCanvas = document.getElementById("officerSign");
    
    const customerCtx = customerSignCanvas.getContext("2d");
    const officerCtx = officerSignCanvas.getContext("2d");
    
    function getEventPosition(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
    return {
    x: e.touches[0].clientX - rect.left,
    y: e.touches[0].clientY - rect.top
    };
    } else {
    return {
    x: e.offsetX,
    y: e.offsetY
    };
    }
    }
    
    function startDrawing(e, ctx, canvas) {
    isDrawing = true;
    const pos = getEventPosition(e, canvas);
    x = pos.x;
    y = pos.y;
    // Prevent scrolling when touch starts
    e.preventDefault();
    }
    
    function draw(e, ctx, canvas) {
    if (!isDrawing) return;
    const pos = getEventPosition(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    x = pos.x;
    y = pos.y;
    // Prevent scrolling while drawing
    e.preventDefault();
    }
    
    function stopDrawing(e) {
    isDrawing = false;
    // Prevent scrolling when touch ends
    e.preventDefault();
    }
    
    // Prevent touch actions like scrolling or zooming
    function preventTouch(e) {
    e.preventDefault();
    }
    
    // Attach event listeners for Customer canvas
    customerSignCanvas.addEventListener("mousedown", (e) => startDrawing(e, customerCtx, customerSignCanvas));
    customerSignCanvas.addEventListener("mousemove", (e) => draw(e, customerCtx, customerSignCanvas));
    customerSignCanvas.addEventListener("mouseup", stopDrawing);
    customerSignCanvas.addEventListener("mouseout", stopDrawing);
    
    customerSignCanvas.addEventListener("touchstart", (e) => startDrawing(e, customerCtx, customerSignCanvas));
    customerSignCanvas.addEventListener("touchmove", (e) => draw(e, customerCtx, customerSignCanvas));
    customerSignCanvas.addEventListener("touchend", stopDrawing);
    
    // Attach event listeners for Officer canvas
    officerSignCanvas.addEventListener("mousedown", (e) => startDrawing(e, officerCtx, officerSignCanvas));
    officerSignCanvas.addEventListener("mousemove", (e) => draw(e, officerCtx, officerSignCanvas));
    officerSignCanvas.addEventListener("mouseup", stopDrawing);
    officerSignCanvas.addEventListener("mouseout", stopDrawing);
    
    officerSignCanvas.addEventListener("touchstart", (e) => startDrawing(e, officerCtx, officerSignCanvas));
    officerSignCanvas.addEventListener("touchmove", (e) => draw(e, officerCtx, officerSignCanvas));
    officerSignCanvas.addEventListener("touchend", stopDrawing);
    
    // Prevent default touch actions for both canvases
    customerSignCanvas.addEventListener("touchstart", preventTouch, { passive: false });
    customerSignCanvas.addEventListener("touchmove", preventTouch, { passive: false });
    officerSignCanvas.addEventListener("touchstart", preventTouch, { passive: false });
    officerSignCanvas.addEventListener("touchmove", preventTouch, { passive: false });
    
    const button = document.getElementById("generatePdfButton");
    button.addEventListener('click', function () {
        // Options for html2pdf
        element1 = document.getElementById("element1")
        
        var opt = {
            margin: [1,1,1,1],
            filename:     'HT_Inspection_Sheet.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 3, scrollY:0},
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' },
            pagebreak:    { mode: ['css', 'legacy'] } // Ensure CSS page breaks are respected
        };
    
        html2pdf().from(element1).set(opt).save();
    });
});
// Function to clear a canvas
function clearCanvas(canvas) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height); // Clears the entire canvas
    }
    
    // Event listeners for reset buttons
    document.getElementById('resetCustomerSign').addEventListener('click', function () {
    const customerSignCanvas = document.getElementById('customersign');
    clearCanvas(customerSignCanvas);
    });
    
    document.getElementById('resetOfficerSign').addEventListener('click', function () {
    const officerSignCanvas = document.getElementById('officerSign');
    clearCanvas(officerSignCanvas);
    });
