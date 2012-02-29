var appPieMenu = new dnb.PieMenu({
	id:"appPieMenu",
	iconProps : {
		width : 20,
		height : 20
	},

	// NOTE: must be one more of these than the number of tool sets!
	radii : [0, 30, 80, 130],
	
	tools : [
		// center
		[	
			new dnb.SelectItemTool(),

			new dnb.SelectBitsTool()
			
		],
		
		// inner ring
		[

			new dnb.NewBitmapTool(),
			
/*
			new dnb.NewItemTool({
				title : "Draw Line",
				itemType : dnb.Line,
				icon : new dnb.Line({stroke:"black", lineWidth:2})
			}),
*/
			new dnb.NewItemTool({
				title : "Draw Rectangle",
				itemType : dnb.Rect,
				icon : new dnb.Rect({stroke:"black", lineWidth:2})
			}),
		
			new dnb.NewItemTool({
				title : "Draw Circle",
				itemType : dnb.Circle,
				icon : new dnb.Circle({stroke:"black", lineWidth:2})
			}),
/*	
			new dnb.NewItemTool({
				title : "Draw RoundRectangle",
				itemType : dnb.RoundRect,
				icon : new dnb.RoundRect({radius:5, stroke:"black", lineWidth:2})
			}),
	

			new dnb.NewItemTool({
				title : "Draw Triangle",
				itemType : dnb.Path.createSubclass("Triangle", {
					points:"M 50 0 L 100 100 L 0 100 Z",
					close:true
				}),
				icon : new dnb.Triangle({stroke:"black", lineWidth:2})
				
			}),

			new dnb.NewItemTool({
				title : "Draw Star",
				itemType : dnb.Path.createSubclass("Star", {
					points:"M 50 0 L 61 40 100 40 69 62 80 100 50 79 20 100 31 62 0 40 39 40Z",
					close:true
				}),
				icon : new dnb.Star({stroke:"black", lineWidth:2})
			}),
*/
			new dnb.NewItemTool({
				title : "Draw Heart",
				itemType : dnb.Path.createSubclass("Heart", {
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
				icon : new dnb.Heart({stroke:"black", lineWidth:2})
			}),
/*
			new dnb.NewItemTool({
				title : "Draw Round Star",
				itemType : dnb.RoundStar,
				icon : new dnb.RoundStar({stroke:"black", lineWidth:2, spikeHeight:3, spikeCount:10})
			}),
*/

			new dnb.PaintTool(),
			new dnb.BrushTool(),
			new dnb.SmoothBrushTool(),
			new dnb.EraserTool(),
			new dnb.LassooTool(),

			new dnb.NewBitmapTextTool(),
			

		],
		[

			new dnb.LineChooser(),
			new dnb.FillChooser(),
			new dnb.RotateTool(),
			new dnb.MagnifyTool()

		]
	]
});