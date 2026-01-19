
interface Node {
	s_note?: Note;
	c_note?: Note;
	offset: number;
	zero?: boolean;
	root?: Node;
	rootSi?: number;
	id?: string;
	si: number;
	ci: number;
	prev?: Node;
	deep: number;
	totalCost: number;
	value: number;
	prior?: number;
	backPrior?: number;
	selfCost?: number;
	path?: number[];
	priorByOffset?: (offset: number) => number;

	evaluatePrev?: (node: Node) => boolean;
};


interface Note {
	index: number;
	pitch: number;
	start: number | null;
	softIndex?: number;
	deltaSi?: number;
	matches?: Node[];
	startTick?: number;
};


interface Notation {
	notes: Note[];
	pitchMap?: {[pitch: number]: Note[]};
};



export {
	Node,
	Note,
	Notation,
};
