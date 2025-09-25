import React, { Fragment, useEffect, useState } from "react";
import { Row, Table, Button, Col } from "reactstrap";
import { Link } from "react-router-dom";

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender
} from '@tanstack/react-table';

import { rankItem } from '@tanstack/match-sorter-utils';
import JobListGlobalFilter from "./GlobalSearchFilter";

// Column Filter
const Filter = ({
  column
}) => {
  const columnFilterValue = column.getFilterValue();

  return (
    <>
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? '')}
        onChange={value => column.setFilterValue(value)}
        placeholder="Search..."
        className="w-36 border shadow rounded"
        list={column.id + 'list'}
      />
      <div className="h-1" />
    </>
  );
};

// Global Filter
const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [debounce, onChange, value]);

  return (
    <React.Fragment>
      <Col sm={4}>
        <input {...props} value={value} onChange={e => setValue(e.target.value)} />
      </Col>
    </React.Fragment>
  );
};

const TableContainer = ({
  columns,
  data,
  tableClass,
  theadClass,
  divClassName,
  isBordered,
  isPagination,
  isGlobalFilter,
  paginationWrapper,
  SearchPlaceholder,
  pagination,
  buttonClass,
  buttonName,
  isAddButton,                    
  isCustomPageSize,
  handleUserClick,
  isJobListGlobalFilter,
  customPageSize,
  onPageSizeChange,
  fromRecord = 0,
  toRecord = 0,
  totalRecords = 0,
  onSortChange,
  currentPage,
  onPageChange,
  users,
  agents,
  selectedUser,
  setSelectedUser,
  selectedAgent,
  setSelectedAgent,
  startDate,
  setStartDate,
  endDate,
  setEndDate
}) => {
  console.log('TableContainer rendered');

  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const fuzzyFilter = (row, columnId, value, addMeta) => {
    const itemRank = rankItem(row.getValue(columnId), value);
    addMeta({
      itemRank
    });
    return itemRank.passed;
  };

  const table = useReactTable({
    columns,
    data,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      columnFilters,
      globalFilter,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const {
    getHeaderGroups,
    getRowModel,
    getCanPreviousPage,
    getCanNextPage,
    getPageOptions,
    setPageIndex,
    nextPage,
    previousPage,
    setPageSize,
    getState
  } = table;

  useEffect(() => {
    if (customPageSize) {
      setPageSize(Number(customPageSize));
      // Removed onPageSizeChange from here to prevent infinite loop
    }
  }, [customPageSize, setPageSize]);

  return (
    <Fragment>
      {/* Filters row (JobListGlobalFilter) */}
      {isJobListGlobalFilter && (
        <div className="d-flex align-items-end mb-2 flex-wrap">
          <div className="me-2">
            <JobListGlobalFilter
              setGlobalFilter={setGlobalFilter}
              users={users}
              agents={agents}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              selectedAgent={selectedAgent}
              setSelectedAgent={setSelectedAgent}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
            />
          </div>
        </div>
      )}
      {/* Page size and search row */}
      <div className="d-flex align-items-end mb-2 flex-wrap">
        {isCustomPageSize && (
          <div style={{ minWidth: 180 }}>
            <select
              className="form-select form-select-md pageSize"
              value={customPageSize || table.getState().pagination.pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                if (onPageSizeChange) {
                  onPageSizeChange(Number(e.target.value));
                }
              }}
            >
              {[10, 20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="ms-auto d-flex align-items-end" style={{ minWidth: 600, maxWidth: 1100 }}>
          {isGlobalFilter && (
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              className="form-control form-control-md search-box"
              placeholder={SearchPlaceholder}
            />
          )}
          {isAddButton && (
            <div className="ms-2">
              <Button type="button" className={buttonClass} onClick={handleUserClick}>
                <i className="mdi mdi-plus me-1"></i> {buttonName}
              </Button>
            </div>  
          )}
        </div>
      </div>

      <div className={divClassName ? divClassName : "table-responsive"}>
<Table
  hover
  className={tableClass}
  bordered={isBordered}
  style={{ borderCollapse: "separate", borderSpacing: "1px 0px"}} 
>
  <thead className={theadClass}>
    {getHeaderGroups().map(headerGroup => (
      <tr key={headerGroup.id}>
        {headerGroup.headers.map(header => (
          <th
            key={header.id}
            colSpan={header.colSpan}
              style={{ backgroundColor: "#0271b9", color: "white", border: "1px solid #ccc" , textAlign : "center"}}
            className={`${header.column.columnDef.enableSorting ? "sorting sorting_desc" : ""}`}
            onClick={() => {
              if (header.column.columnDef.enableSorting && onSortChange) {
                // Toggle sort order
                const field = header.column.columnDef.accessorKey;
                const currentOrder = header.column.getIsSorted() === 'asc' ? 'asc' : 'desc';
                const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
                onSortChange(field, newOrder);
              }
            }}
          >
            {header.isPlaceholder ? null : (
              <React.Fragment>
                <div
                  className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === 'asc' ? ' ▲' : header.column.getIsSorted() === 'desc' ? ' ▼' : ''}
                </div>
                
              </React.Fragment>
            )}
          </th>
        ))}
      </tr>
    ))}
  </thead>

  <tbody>
    {getRowModel().rows.length === 0 ? (
      <tr>
        <td colSpan={columns.length} className="text-center">No data found</td>
      </tr>
    ) : (
      getRowModel().rows.map(row => (
        <tr key={row.id}>
          {row.getVisibleCells().map(cell => (
            <td key={cell.id} className={row.original._rowClass || ''} style={{ border: "1px solid #ccc", textAlign: "center" }}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))
    )}
  </tbody>
</Table>

      </div>


      {
        isPagination && (
          <Row>
            {getRowModel().rows.length !== 0 && fromRecord > 0 && toRecord > 0 && totalRecords > 0 && (
              <Col sm={12} md={5}>
                <div className="dataTables_info">
                  Showing {fromRecord} - {toRecord} of {totalRecords} Results
                </div>
              </Col>
            )}
            {getRowModel().rows.length !== 0 && (
              <Col sm={12} md={7}>
                <div className={paginationWrapper}>
                  <ul className={pagination}>
                    <li className={`paginate_button page-item previous ${currentPage === 1 ? "disabled" : ""}`}>
                      <a href="#" className="page-link" onClick={e => { e.preventDefault(); if (currentPage > 1) onPageChange(currentPage - 1); }}><i className="mdi mdi-chevron-left"></i></a>
                    </li>
                    {/* Render page numbers dynamically based on totalRecords and customPageSize */}
                    {Array.from({ length: Math.max(1, Math.ceil(totalRecords / (customPageSize || 1))) }, (_, i) => (
                      <li
                        key={i}
                        className={`paginate_button page-item ${currentPage === i + 1 ? "active" : ""}`}
                      >
                        <a
                          href="#"
                          className="page-link"
                          onClick={e => { e.preventDefault(); if (currentPage !== i + 1) onPageChange(i + 1); }}
                          style={
                            currentPage === i + 1
                              ? { backgroundColor: "rgb(2, 113, 185)", borderColor: "rgb(2, 113, 185)", color: "#fff" }
                              : {}
                          }
                        >
                          {i + 1}
                        </a>
                      </li>
                    ))}
                    <li className={`paginate_button page-item next ${(currentPage === Math.ceil(totalRecords / (customPageSize || 1)) || totalRecords === 0) ? "disabled" : ""}`}>
                      <a href="#" className="page-link" onClick={e => { e.preventDefault(); if (currentPage < Math.ceil(totalRecords / (customPageSize || 1))) onPageChange(currentPage + 1); }}><i className="mdi mdi-chevron-right"></i></a>
                    </li>
                  </ul>
                </div>
              </Col>
            )}
          </Row>
        )
      }
    </Fragment>
  );
};

export default TableContainer;