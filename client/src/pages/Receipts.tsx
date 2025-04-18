import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Switch, Route, Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowLeft } from "lucide-react";
import ReceiptsList from "@/components/receipts/ReceiptsList";
import ReceiptUpload from "@/components/receipts/ReceiptUpload";
import ReceiptDetail from "@/components/receipts/ReceiptDetail";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const Receipts = () => {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Check which routes are matching
  const [isBaseRoute] = useRoute("/receipts");
  const [isUploadRoute] = useRoute("/receipts/upload");
  const [isDetailRoute, detailParams] = useRoute("/receipts/:id");

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Render the receipts list page
  const renderReceiptsList = () => (
    <>
      {/* Page header with gradient background */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 mr-2 text-primary">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 6v2" />
                <path d="M12 16v2" />
              </svg>
              Receipts & Transactions
            </h1>
            <p className="text-sm text-gray-600 mt-1">View and manage your purchase history with AI insights</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link to="/receipts/upload">
              <Button className="inline-flex items-center bg-primary">
                <Plus className="mr-2 h-4 w-4" />
                Upload Receipt
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-1">
              <Input
                placeholder="Search by merchant or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.isArray(categories) ? categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                  <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipts List */}
      <ReceiptsList 
        searchTerm={searchTerm}
        sortBy={sortBy}
        categoryFilter={categoryFilter}
      />
    </>
  );

  // Render the receipt upload page
  const renderReceiptUpload = () => (
    <>
      {/* Header with gradient background */}
      <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 mb-8 border-l-4 border-l-green-500">
        <div>
          <Link to="/receipts">
            <Button variant="outline" className="mb-4 bg-white hover:bg-gray-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Receipts
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 mr-2 text-green-600">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M12 18v-6" />
              <path d="M8 18v-1" />
              <path d="M16 18v-3" />
            </svg>
            Upload Receipt
          </h1>
          <p className="text-sm text-gray-600 mt-1">Upload a new receipt for AI-powered analysis and tracking</p>
        </div>
      </div>
      <ReceiptUpload />
    </>
  );

  // Render receipt detail page
  const renderReceiptDetail = (id: string) => (
    <>
      {/* Header with gradient background */}
      <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 mb-8 border-l-4 border-l-blue-500">
        <div>
          <Link to="/receipts">
            <Button variant="outline" className="mb-4 bg-white hover:bg-gray-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Receipts
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 mr-2 text-blue-600">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
              <path d="M12 6v2" />
              <path d="M12 16v2" />
            </svg>
            Receipt Details
          </h1>
          <p className="text-sm text-gray-600 mt-1">View detailed information and insights for this transaction</p>
        </div>
      </div>
      <ReceiptDetail id={parseInt(id)} />
    </>
  );

  // Use internal wouter Switch for better nested route handling
  return (
    <div>
      <Switch>
        <Route path="/receipts">
          {() => renderReceiptsList()}
        </Route>
        <Route path="/receipts/upload">
          {() => renderReceiptUpload()}
        </Route>
        <Route path="/receipts/:id">
          {(params) => renderReceiptDetail(params.id)}
        </Route>
        <Route>
          {/* Default fallback if no routes match */}
          {() => renderReceiptsList()}
        </Route>
      </Switch>
    </div>
  );
};

export default Receipts;