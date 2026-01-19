
class Stream {
	array: Uint8Array;
	position: number;


	constructor (source: ArrayBuffer | Uint8Array | number[]) {
		if (source instanceof Uint8Array)
			this.array = source;
		else if (Array.isArray(source))
			this.array = new Uint8Array(source as number[]);
		else
			this.array = new Uint8Array(source as ArrayBuffer);

		this.position = 0;
	}

	eof (): boolean {
		return this.position >= this.array.length;
	}

	read (length: number): Uint8Array {
		const result = this.array.slice(this.position, this.position + length);
		this.position += length;

		return result;
	}

	readString (length: number): string {
		const data = Array.from(this.read(length));

		return data.map(c => String.fromCharCode(c)).join("");
	}

	readInt32 (): number {
		const result = (
			(this.array[this.position] << 24) +
			(this.array[this.position + 1] << 16) +
			(this.array[this.position + 2] << 8) +
			this.array[this.position + 3]
		);
		this.position += 4;

		return result;
	}

	readInt16 (): number {
		const result = (
			(this.array[this.position] << 8) +
			this.array[this.position + 1]
		);
		this.position += 2;

		return result;
	}

	readInt8 (signed?: boolean): number {
		let result = this.array[this.position];
		if (signed && result > 127)
			result -= 256;
		this.position += 1;

		return result;
	}

	readVarInt (): number {
		let result = 0;
		while (true) {
			const b = this.readInt8();
			if (b & 0x80) {
				result += (b & 0x7f);
				result <<= 7;
			}
			else {
				return result + b;
			}
		}
	}
};



export default Stream;
