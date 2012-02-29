function calcItemCount () {
    return this.mem_size / this.averageItemSize;
}

function calcItemSize () {
    return this.mem_size / this.itemCount;
}

function calcFlashBufferSize() {
    return 0.10 * this.mem_size;
}

function calcEstimatedDRAM() {
    var avg_size = this.mem_size / this.itemCount;
    //    items = sizeof(item)(80) * item_count
    var items = 80 * this.itemCount;

    // nblocks = (items + flash_buffer_size) / block_size(4096)
    var nblocks = (items + this.flashBufferSize) / 4096;

    // subtotal = (items + flash_buffer_size + 
    //                (nblocks * sizeof(BlockMeta)(56) +
    //                (items/block_size) * sizeof(MemoryPoolMeta)(64);


    var total = items + this.flash_buffer_size +
        (nblocks * 56 ) +
        (items / 4096) * 64;


     if ((this.mem_size/this.itemCount) < 512) {
         // total += (mem_size / block_size) * sizeof(MemoryPoolMeta)(64) +
         //     item_count * sizeof(void *)(8);

         total += (this.mem_size / 4096) * 64 +
             this.itemCount * 8;

     } else {
        if ((this.mem_size/this.itemCount) > 4096) {
            n = this.mem_size / this.averageItemSize;
        } else {
            n = this.mem_size / 4096;
        }
        total += this.itemCount * (2 * 8 + 24) +
            n * 64;
     } 
     return total;
}
