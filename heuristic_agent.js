function evaluateBoard(board, bestMove = false) {
    let aggregateHeight = 0;
    let completeLines = 0;
    let holes = 0;
    let bumpiness = 0;
    let columnHeights = new Array(nx).fill(0);

    for (let x = 0; x < nx; x++) {
        for (let y = 0; y < ny; y++) {
            if (board[x][y] !== 0) {
                columnHeights[x] = ny - y;
                aggregateHeight += columnHeights[x];
                break;
            }
        }
    }

    let maxHeight = Math.max(...columnHeights);

    for (let y = 0; y < ny; y++) {
        var complete = true;
        for (let x = 0; x < nx; x++) {
            if (board[x][y] === 0) {
                complete = false;
                break;
            }
        }
        if (complete)
            completeLines++;
    }

    for (let x = 0; x < nx; x++) {
        let blockFound = false;
        for (let y = 0; y < ny; y++) {
            if (board[x][y] !== 0) {
                blockFound = true;
            } else if (blockFound && board[x][y] === 0) {
                holes++;
            }
        }
    }

    for (let x = 0; x < nx - 1; x++) {
        bumpiness += Math.abs(columnHeights[x] - columnHeights[x + 1]);
    }
    let result = -0.51 * aggregateHeight + 0.76 * completeLines - 0.36 * holes - 0.18 * bumpiness;
    if (maxHeight > 10) {result-= maxHeight - 10;}
    console.log(`aggregateHeight ${aggregateHeight} completeLines ${completeLines} holes ${holes} bumpiness ${bumpiness} columnHeights ${columnHeights}`)
    return result;
}

function copyBlocks(blocks) {
    let new_blocks = [];
    for (let x = 0; x < blocks.length; x++) {
        new_blocks[x] = [];
        for (let y = 0; y < blocks[x].length; y++) {
            new_blocks[x][y] = blocks[x][y];
        }
    }
    return new_blocks;
}

function getPieceSize(block) {
    let binaryString = block.toString(2).padStart(16, '0');

    let columnsWithOnes = [0, 0, 0, 0];

    for (let i = 0; i < 4; i++) {
        let row = binaryString.slice(i * 4, (i + 1) * 4);
        for (let j = 0; j < 4; j++) {
            if (row[j] === '1') {
                columnsWithOnes[j] = 1;
            }
        }
    }

    return columnsWithOnes.reduce((sum, col) => sum + col, 0);
}

function printMatrixFromInt(intValue) {
    let binaryString = intValue.toString(2).padStart(16, '0');

    let matrix = [];
    for (let i = 0; i < 4; i++) {
        matrix.push(binaryString.slice(i * 4, (i + 1) * 4).split(''));
    }

    console.log('Matrix Representation:');
    matrix.forEach(row => console.log(row.join('')));
}

function eachblock(type, x, y, dir, fn) {
    let bit, row = 0, col = 0;
    let blocks = type.blocks[dir];
    for (bit = 0x8000; bit > 0; bit = bit >> 1) {
        if (blocks & bit) {
            fn(x + col, y + row);
        }
        if (++col === 4) {
            col = 0;
            ++row;
        }
    }
}

function occupied(type, x, y, dir, board) {
    let result = false;
    eachblock(type, x, y, dir, function (x, y) {
        if (x < 0 || x >= nx || y < 0 || y >= ny || board[x][y]) {
            result = true;
        }
    });
    return result;
}

function getDropPosition(piece, x, board) {
    let y = 0;
    while (!occupied(piece.type, x, y + 1, piece.dir, board)) {
        y++;
        if (y > ny) {
            return null;
        }
    }
    return y;
}

function getPossibleMoves(piece, board) {
    let moves = [];
    for (let dir = 0; dir < 4; dir++) {
        let new_piece = { ...piece };
        new_piece.dir = dir;
        let size_of_piece = getPieceSize(new_piece.type.blocks[new_piece.dir]);
        for (let x = 0; x <= nx - size_of_piece; x++) {
            let y = getDropPosition(new_piece, x, board);
            if (y !== null) {
                let new_blocks = copyBlocks(board);
                eachblock(new_piece.type, x, y, new_piece.dir, function (x, y) {
                    new_blocks[x][y] = new_piece.type;
                });
                moves.push({ piece: new_piece, x: x, y: y, board: new_blocks });
            }
        }
    }
    return moves;
}

function selectBestMove(piece, nextPiece) {

    let moves = []
    for (let turn = 0; turn < 2; turn++) {
        if (turn === 0) {
            moves = getPossibleMoves(piece, blocks);
            moves.forEach(move => {
                move.father = move;
            });
        } else if (turn === 1) {
            let new_moves = []
            for (let i = 0; i < moves.length; i++) {
                let boardAfterFirstMove = moves[i].board;
                let new_moves_part = getPossibleMoves(nextPiece, boardAfterFirstMove);
                new_moves_part.forEach(move => {move.father = moves[i].father;})
                new_moves.push(...new_moves_part);
            }
            moves = new_moves;
            moves.forEach(move => {
                move.score = evaluateBoard(move.board);
            });
            moves.sort((a, b) => b.score - a.score);
        } else {
            let max_size = 5;
            let new_moves = []
            for (let i = 0; i < Math.min(moves.length, max_size); i++) {
                let boardAfterFirstMove = moves[i].board;
                let minScore = Infinity;
                for (let j = 0; j < 7; j++) {
                    let newPiece = getPiece(j);
                    let new_moves_part = getPossibleMoves(newPiece, boardAfterFirstMove);
                    new_moves_part.forEach(move => {
                        move.score = evaluateBoard(move.board);
                        move.father = moves[i].father;
                    });
                    new_moves_part.sort((a, b) => b.score - a.score);
                    new_moves_part = new_moves_part.slice(0, max_size);
                    minScore = Math.min(minScore, new_moves_part[0].score);
                    new_moves.push(...new_moves_part);
                }
                if (i !== Math.min(moves.length, max_size) - 1) {
                    moves = new_moves;
                }
                else {
                    moves.forEach(move => {
                        move.score = minScore;
                    });
                    moves.sort((a, b) => b.score - a.score);
                }
            }
        }
    }
    return moves[0].father;
}
