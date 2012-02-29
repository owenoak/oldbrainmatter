var appPieMenu = new dnb.PieMenu({
	id:"appPieMenu",

	// NOTE: must be one more of these than the number of tool sets!
	radii 		: [  0,  30,  75,  95, 140],
	startAngles : [270, 270, 270, 270, 279],
	
	tools : [
		// center
		[	
			new dnb.SelectItemTool(),
			new dnb.SelectBitsTool(),
		],
		
		// inner ring
		[

			new dnb.MagnifyTool(),
			new dnb.NewBitmapTextTool(),
			new dnb.NewItemTool({
				title : "Draw Shape",
				itemConstructor : dnb.Circle,
				icon : new dnb.Circle({stroke:"black", lineWidth:2, width:20, height:20})
			}),
			new dnb.BrushTool(),
			new dnb.EraserTool(),
			new dnb.UndoTool(),
			new dnb.LassooTool(),
			new dnb.NewBitmapTool(),
			new dnb.SliceTool(),
			new dnb.SaveCommand()

		],
		
		// chooser ring
		[
			new dnb.MagnifyChooser({icon:new dnb.MenuIcon({angle:270})}),
			new dnb.FontChooser({icon:new dnb.MenuIcon({angle:306})}),
			new dnb.ShapeChooser({icon:new dnb.MenuIcon({angle:342})}),
			new dnb.BrushChooser({icon:new dnb.MenuIcon({angle:18})}),
			new dnb.EraserChooser({icon:new dnb.MenuIcon({angle:54})}),
			new dnb.HistoryChooser({icon:new dnb.MenuIcon({angle:90})}),
			new dnb.SelectionChooser({icon:new dnb.MenuIcon({angle:126})}),
			new dnb.SliceChooser({icon:new dnb.MenuIcon({angle:162})}),
			new dnb.ImageChooser({icon:new dnb.MenuIcon({angle:198})}),
			new dnb.SaveAsChooser({icon:new dnb.MenuIcon({angle:234})})
		
		],

		// outer ring
		[

			// N
			new dnb.ZoomOutCommand(),
			new dnb.HelpTool(),
			new dnb.OptionsChooser(),
			new dnb.PenTool(),
			new dnb.FreeformPenTool(),

			// E
			new dnb.PencilTool(),
			new dnb.LineChooser(),			
			new dnb.PaintBucketTool(),
			new dnb.FillChooser(),
//			new dnb.StampTool(),
//			new dnb.HistoryBushTool(),
			new dnb.RedoTool(),
			
			// S
			new dnb.EyeDropperTool(),
			new dnb.WandTool(),
//			new dnb.TransformSelectionTool(),
			new dnb.RotateTool(),
			new dnb.CropCommand(),
			new dnb.MeasureTool(),
			
			// W
			new dnb.MaskTool(),
			new dnb.ColorChangeChooser(),

			new dnb.PrintCommand(),
			new dnb.LoadCommand(),
			new dnb.ScrollTool()
		]
	]
});



var shapeMenu = new dnb.PieMenu({
	id:"shapeMenu",
	tools : [
		[
			new dnb.SelectItemTool()		
		],
	
		[

			new dnb.NewItemTool({
				title : "Draw Circle",
				itemConstructor : dnb.Circle,
				icon : new dnb.Circle({stroke:"black", lineWidth:2, width:16, height:16})
			}),

			new dnb.NewItemTool({
				title : "Draw RoundRectangle",
				itemConstructor : dnb.RoundRect,
				icon : new dnb.RoundRect({radius:5, stroke:"black", lineWidth:2, width:16, height:16})
			}),
	
			new dnb.NewItemTool({
				title : "Draw Rectangle",
				itemConstructor : dnb.Rect,
				icon : new dnb.Rect({stroke:"black", lineWidth:2, width:16, height:16})
			}),

			new dnb.NewItemTool({
				title : "Draw Triangle",
				itemConstructor : dnb.Path.createSubclass("Triangle", {
					points:"M 50 0 L 100 100 L 0 100 Z",
					close:true
				}),
				icon : new dnb.Triangle({stroke:"black", lineWidth:2, width:16, height:16})
				
			}),
	
			new dnb.NewItemTool({
				title : "Draw Star",
				itemConstructor : dnb.Path.createSubclass("Star", {
					points:"M 50 0 L 61 40 100 40 69 62 80 100 50 79 20 100 31 62 0 40 39 40Z",
					close:true
				}),
				icon : new dnb.Star({stroke:"black", lineWidth:2, width:16, height:16})
			}),

			new dnb.NewItemTool({
				title : "Draw Heart",
				itemConstructor : dnb.Path.createSubclass("Heart", {
					points: "M 10 4 "+
							"C 9.8 3 11 0 15 0 "+
							"C 19 0 21 5 20 8 "+
							"C 19 11 12.8 16.3 12.1 17 "+
							"C 11.5 17.7 10.6 19 10 20 "+
							"C 9.4 18.8 8.6 17.7 8 17 "+
							"C 7.3 16.2 1.1 11 0 8 "+
							"C -1.1 4.9 1.3 0 5 0 "+
							"C 8.7 0 10.2 3 10 4",
					close:true
				}),
				icon : new dnb.Heart({stroke:"black", lineWidth:2, width:16, height:16})
			}),

			new dnb.NewItemTool({
				title : "Draw Round Star",
				itemConstructor : dnb.RoundStar,
				icon : new dnb.RoundStar({stroke:"black", lineWidth:2, width:16, height:16, spikeHeight:3, spikeCount:10})
			}),

			new dnb.NewItemTool({
				title : "Draw Line",
				itemConstructor : dnb.Line,
				icon : new dnb.Line({stroke:"black", lineWidth:2, width:16, height:16})
			})
		]
	]
});


var brushMenu = new dnb.PieMenu({
	id:"brushMenu",
	tools : [
		[
			new dnb.BrushTool(),
			new dnb.PencilTool()
		],
	
		[

			new dnb.BrushSizeCommand({	brushSize:  1 }),
			new dnb.BrushSizeCommand({	brushSize:  2 }),
			new dnb.BrushSizeCommand({	brushSize:  3 }),
			new dnb.BrushSizeCommand({	brushSize:  4 }),
			new dnb.BrushSizeCommand({	brushSize:  6 }),
			new dnb.BrushSizeCommand({	brushSize:  8 }),
			new dnb.BrushSizeCommand({	brushSize: 10 }),
			new dnb.BrushSizeCommand({	brushSize: 15 }),
			new dnb.BrushSizeCommand({	brushSize: 20 })
//			new dnb.BrushSizeCommand({	brushSize: 30 }),
//			new dnb.BrushSizeCommand({	brushSize: 40 }),
//			new dnb.BrushSizeCommand({	brushSize: 50 })
		]
	]
});

var eraserMenu = new dnb.PieMenu({
	id:"eraserMenu",
	tools : [
		[
			new dnb.EraserTool()
		],
	
		[

			new dnb.EraserSizeCommand({	brushSize:  1 }),
			new dnb.EraserSizeCommand({	brushSize:  2 }),
			new dnb.EraserSizeCommand({	brushSize:  3 }),
			new dnb.EraserSizeCommand({	brushSize:  4 }),
			new dnb.EraserSizeCommand({	brushSize:  6 }),
			new dnb.EraserSizeCommand({	brushSize:  8 }),
			new dnb.EraserSizeCommand({	brushSize: 10 }),
			new dnb.EraserSizeCommand({	brushSize: 15 }),
			new dnb.EraserSizeCommand({	brushSize: 20 })
//			new dnb.EraserSizeCommand({	brushSize: 30 }),
//			new dnb.EraserSizeCommand({	brushSize: 40 }),
//			new dnb.EraserSizeCommand({	brushSize: 50 })
		]
	]
});